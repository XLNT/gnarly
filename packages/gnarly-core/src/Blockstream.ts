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
      console.log(
        `[fast-forward] Starting from ${startBlockNumber.toNumber()} to ${latestBlockNumber.toNumber()}`,
      )
      this.syncing = true
      let i = startBlockNumber.clone()
      while (i.lt(latestBlockNumber)) {
        // if we're at the top of the queue
        // wait a bit and then add the thing
        while (this.pendingTransactions.getQueueLength() + 1 >= MAX_QUEUE_LENGTH) {
          console.log(`[queue] Reached max queue size of ${MAX_QUEUE_LENGTH}, waiting a bit...`)
          await timeout(5000)
        }

        const block = await globalState.api.getBlockByNumber(i)
        console.log(`[fast-forward] block ${block.number} (${block.hash})`)
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
    this.streamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken)
    this.streamer.unsubscribeFromOnBlockRemoved(this.onBlockRemovedSubscriptionToken)
    console.log('Pending Transactions:', this.pendingTransactions.getPendingLength())
    await this.pendingTransactions.add(() => Promise.resolve())
    console.log('[gnarly] Done!')
  }

  private onBlockAdd = async (block: BlockstreamBlock) => {
    const pendingTransaction = async () => {
      console.log(`[onBlockAdd] ${block.number} (${block.hash})`)
      return this.ourbit.processTransaction(
        block.hash,
        this.onBlock(block, this.syncing),
      )
    }

    this.pendingTransactions.add(pendingTransaction)
  }

  private onBlockInvalidated = (block: BlockstreamBlock) => {
    console.log(`[onBlockInvalidated] ${block.number} (${block.hash})`)
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
