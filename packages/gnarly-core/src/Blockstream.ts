import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:blockstream')
const debugFastForward = makeDebug('gnarly-core:blockstream:fast-forward')
const debugOnBlockAdd = makeDebug('gnarly-core:blockstream:onBlockAdd')
const debugOnBlockInvalidated = makeDebug('gnarly-core:blockstream:onBlockInvalidated')

import {
  Block as BlockstreamBlock,
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
    let latestBlock: IJSONBlock | null = null

    if (fromBlockHash !== null) {
      // ^ if fromBlockHash is provided, it takes priority
      debug('Continuing from blockHash %s', fromBlockHash)

      latestBlock = await globalState.api.getBlockByHash(fromBlockHash)
    } else {
      // we are starting from head
      debug('Starting from head')

      latestBlock = await globalState.api.getLatestBlock()
    }

    this.onBlockAddedSubscriptionToken = this.streamer.subscribeToOnBlockAdded(this.onBlockAdd)
    this.onBlockRemovedSubscriptionToken = this.streamer.subscribeToOnBlockRemoved(this.onBlockInvalidated)

    const startBlockNumber = toBN(latestBlock.number).add(toBN(1))
    debug('Beginning from block %d', startBlockNumber)

    // get the latest block
    let latestBlockNumber = toBN(
      (await globalState.api.getLatestBlock()).number,
    )

    // if we're not at that block number, start pulling the blocks
    // from before until we catch up, then track latest
    if (latestBlockNumber.gt(startBlockNumber)) {
      debugFastForward(
        'Starting from %d and continuing to %d',
        startBlockNumber.toNumber(),
        latestBlockNumber.toNumber(),
      )
      this.syncing = true
      let i = startBlockNumber.clone()
      while (i.lt(latestBlockNumber)) {
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
        i = i.add(toBN(1))
        await this.streamer.reconcileNewBlock(block)
        // TODO: easy optimization, only check latest block on the last
        // iteration
        latestBlockNumber = toBN((await globalState.api.getLatestBlock()).number)
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
      toBN(historicalBlocks[historicalBlocks.length - 1].number).toString(),
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
}

export default BlockStream
