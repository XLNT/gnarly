import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:blockstream')
const debugFastForward = makeDebug('gnarly-core:blockstream:fast-forward')
const debugOnBlockAdd = makeDebug('gnarly-core:blockstream:onBlockAdd')
const debugOnBlockInvalidated = makeDebug('gnarly-core:blockstream:onBlockInvalidated')

import {
  BlockAndLogStreamer,
} from 'ethereumjs-blockstream'
import 'isomorphic-fetch'
import PQueue = require('p-queue')
import uuid = require('uuid')

import { IJSONBlock } from './models/Block'
import { IJSONLog } from './models/Log'

import {
  timeout,
  toBN,
} from './utils'

import { globalState } from './globalstate'

const MAX_QUEUE_LENGTH = 100

class BlockStream {
  private streamer: BlockAndLogStreamer<IJSONBlock, IJSONLog>

  private onBlockAddedSubscriptionToken
  private onBlockRemovedSubscriptionToken
  private unsubscribeFromNewBlocks
  /**
   * Whether or not the blockstreamer is syncing blocks from the past or not
   */
  private syncing = false

  private pendingTransactions: PQueue = new PQueue({
    concurrency: 1,
  })

  constructor (
    private reducerKey: string,
    private processTransaction: (txId: string, fn: () => Promise<void>, extra: object) => Promise<void> ,
    private rollbackTransaction: (blockHash: string) => Promise<void>,
    private onNewBlock: (block: IJSONBlock, syncing: boolean) => () => Promise < any > ,
    private blockRetention: number = 100,
    private interval: number = 5000,
  ) {
    this.streamer = new BlockAndLogStreamer(globalState.api.getBlockByHash, globalState.api.getLogs, {
      blockRetention: this.blockRetention,
    })
  }

  public start = async (fromBlockHash: string = null) => {
    let localLatestBlock: IJSONBlock | null = null

    // the primary purpose of this function to to extend the historical block reduction
    //   beyond the blockRetention limit provided to ethereumjs-blockstream
    //   because we might have stopped tracking blocks for longer than ~100 blocks and need to catch up

    const remoteLatestBlock = await globalState.api.getLatestBlock()

    if (fromBlockHash !== null) {
      // ^ if fromBlockHash is provided, it takes priority
      debug('Continuing from blockHash %s', fromBlockHash)

      // so look up the latest block we know about
      localLatestBlock = await globalState.api.getBlockByHash(fromBlockHash)

      // need to load that block into the local chain so handlers trigger correctly
      //  when we defer to the ethereumjs-blockstream reconciliation algorithm where it fetches
      //  its own historical blocks
      this.streamer.reconcileNewBlock(localLatestBlock)
    } else {
      // we are starting from head
      debug('Starting from HEAD')

      // ask the remote for the latest "local" block
      localLatestBlock = await globalState.api.getLatestBlock()
    }

    const remoteLatestBlockNumber = toBN(remoteLatestBlock.number)
    const localLatestBlockNumber = toBN(localLatestBlock.number)

    // subscribe to changes in chain
    this.onBlockAddedSubscriptionToken = this.streamer.subscribeToOnBlockAdded(this.onBlockAdd)
    this.onBlockRemovedSubscriptionToken = this.streamer.subscribeToOnBlockRemoved(this.onBlockInvalidated)

    debug('Local block number: %d. Remote block number: %d', localLatestBlockNumber, remoteLatestBlockNumber)

    let syncUpToNumber = await this.latestRemoteNumberWithRetentionBuffer()
    // if we're not at that block number, start pulling the blocks from history
    //   until we enter the block retention limit
    //   once we've gotten to the block retention limit, we need to defer to blockstream's chain
    //   reconciliation algorithm
    if (localLatestBlockNumber.lt(syncUpToNumber)) {
      debugFastForward(
        'Starting from %d and continuing to %d',
        localLatestBlockNumber.toNumber(),
        remoteLatestBlockNumber.toNumber(),
      )
      this.syncing = true
      let i = localLatestBlockNumber.clone()
      while (i.lt(syncUpToNumber)) {
        // if we're at the top of the queue
        // wait a bit and then add the thing
        while (this.pendingTransactions.size >= MAX_QUEUE_LENGTH) {
          debugFastForward(
            'Reached max queue size of %d, waiting a bit...',
            MAX_QUEUE_LENGTH,
          )
          await timeout(5000)
        }

        const block = await globalState.api.getBlockByNumber(i)
        debugFastForward(
          'block %s (%s)',
          toBN(block.number).toString(),
          block.hash,
        )
        await this.streamer.reconcileNewBlock(block)

        i = toBN(block.number).add(toBN(1))
        // TODO: easy optimization, only check latest block on the last
        // iteration
        syncUpToNumber = await this.latestRemoteNumberWithRetentionBuffer()
      }

      this.syncing = false
    }

    this.beginTracking()
  }

  public stop = async () => {
    this.unsubscribeFromNewBlocks()
    if (this.streamer) {
      this.streamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken)
      this.streamer.unsubscribeFromOnBlockRemoved(this.onBlockRemovedSubscriptionToken)
    }
    debug('Pending Transactions: %d', this.pendingTransactions.size)
    await this.pendingTransactions.onIdle()
    debug('Done! Exiting...')
  }

  public initWithHistoricalBlocks = async (historicalBlocks: IJSONBlock[] = []): Promise<any> => {
    // ^ if historicalBlocks provided, reconcile blocks
    debug(
      'Initializing history with last historical block %s',
      toBN(historicalBlocks[historicalBlocks.length - 1].number),
    )

    for (const block of historicalBlocks) {
      await this.streamer.reconcileNewBlock(block)
    }
  }

  private onBlockAdd = async (block: IJSONBlock) => {
    const pendingTransaction = async () => {
      debugOnBlockAdd(
        'block %s (%s)',
        block.number,
        block.hash,
      )

      await this.processTransaction(
        uuid.v4(),
        this.onNewBlock(block, this.syncing),
        {
          blockHash: block.hash,
        },
      )

      await globalState.store.saveHistoricalBlock(this.reducerKey, this.blockRetention, block)
    }

    this.pendingTransactions.add(pendingTransaction)
  }

  private onBlockInvalidated = (block: IJSONBlock) => {
    const pendingTransaction = async () => {
      debugOnBlockInvalidated(
        'block %s (%s)',
        block.number,
        block.hash,
      )

      // when a block is invalidated, rollback the transaction
      await this.rollbackTransaction(block.hash)
      // and then delete the historical block
      await globalState.store.deleteHistoricalBlock(this.reducerKey, block.hash)
    }

    this.pendingTransactions.add(pendingTransaction)
  }

  private beginTracking = () => {
    this.unsubscribeFromNewBlocks = globalState.api.subscribeToNewBlocks(async () => {
      await this.streamer.reconcileNewBlock(await globalState.api.getLatestBlock())
    })
  }

  private latestRemoteNumberWithRetentionBuffer = async () => {
    return toBN(
      (await globalState.api.getLatestBlock()).number,
    ).sub(toBN(this.blockRetention - 10))
    // ^ manually import historical blocks until we're within 90 blocks of HEAD
    // and then we can use blockstream's reconciliation algorithm
  }
}

export default BlockStream
