import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:blockstream')
const debugFastForward = makeDebug('gnarly-core:blockstream:fast-forward')
const debugOnBlockAdd = makeDebug('gnarly-core:blockstream:onBlockAdd')
const debugOnBlockInvalidated = makeDebug('gnarly-core:blockstream:onBlockInvalidated')

import {
  Block as BlockstreamBlock,
  BlockAndLogStreamer,
  Log as BlockstreamLog,
} from 'ethereumjs-blockstream'
import 'isomorphic-fetch'
import Queue = require('promise-queue')

import { IJSONBlock } from './models/Block'
import { IJSONLog } from './models/Log'

import Ourbit from './Ourbit'

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
  private reconciling
  /**
   * Whether or not the blockstreamer is syncing blocks from the past or not
   */
  private syncing = false

  private pendingTransactions: Queue = new Queue(1, MAX_QUEUE_LENGTH)
  // only 100 pending transactions at once or something, dial this in

  constructor (
    private ourbit: Ourbit,
    private onBlock: (block: BlockstreamBlock, syncing: boolean) => () => Promise<any>,
    private interval: number = 5000,
  ) {

  }

  public start = async (fromBlockHash: string = null) => {
    this.streamer = new BlockAndLogStreamer(globalState.api.getBlockByHash, globalState.api.getLogs, {
      blockRetention: 100,
    })

    this.onBlockAddedSubscriptionToken = this.streamer.subscribeToOnBlockAdded(this.onBlockAdd)
    this.onBlockRemovedSubscriptionToken = this.streamer.subscribeToOnBlockRemoved(this.onBlockInvalidated)

    let startBlockNumber
    if (fromBlockHash === null) {
      // if no hash provided, we're starting from scratch
      startBlockNumber = toBN(0)
    } else {
      // otherwise get the expected block's number
      const startFromBlock = await globalState.api.getBlockByHash(fromBlockHash)
      startBlockNumber = toBN(startFromBlock.number).add(toBN(1))
      // ^ +1 because we already know about this block and we want the next
    }

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
        while (this.pendingTransactions.getQueueLength() + 1 >= MAX_QUEUE_LENGTH) {
          debugFastForward(
            'Reached max queue size of %d, waiting a bit...',
            MAX_QUEUE_LENGTH,
          )
          await timeout(5000)
        }

        const block = await globalState.api.getBlockByNumber(i)
        debugFastForward(
          'block %s (%s)',
          block.number,
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
    clearInterval(this.reconciling)
    if (this.streamer) {
      this.streamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken)
      this.streamer.unsubscribeFromOnBlockRemoved(this.onBlockRemovedSubscriptionToken)
    }
    debug('Pending Transactions: %d', this.pendingTransactions.getPendingLength())
    await this.pendingTransactions.add(() => Promise.resolve())
    debug('Done! Exiting...')
  }

  private onBlockAdd = async (block: BlockstreamBlock) => {
    const pendingTransaction = async () => {
      debugOnBlockAdd(
        'block %s (%s)',
        block.number,
        block.hash,
      )

      return this.ourbit.processTransaction(
        block.hash,
        this.onBlock(block, this.syncing),
        {
          blockHash: block.hash,
        },
      )
    }

    this.pendingTransactions.add(pendingTransaction)
  }

  private onBlockInvalidated = (block: BlockstreamBlock) => {
    debugOnBlockInvalidated(
      'block %s (%s)',
      block.number,
      block.hash,
    )

    const pendingTransaction = async () => this.ourbit.rollbackTransaction(block.hash)
    this.pendingTransactions.add(pendingTransaction)
  }

  private beginTracking = () => {
    // @TODO - replace this with a filter
    this.reconciling = setInterval(async () => {
      await this.streamer.reconcileNewBlock(await globalState.api.getLatestBlock())
    }, this.interval)
  }
}

export default BlockStream
