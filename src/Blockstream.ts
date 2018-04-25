import {
  Block as BlockstreamBlock,
  BlockAndLogStreamer,
  Log as BlockstreamLog,
} from 'ethereumjs-blockstream'
import 'isomorphic-fetch'

import { IJSONBlock } from './models/Block'
import { IJSONLog } from './models/Log'

import Ourbit from './Ourbit'

import {
  toBN,
} from './utils'

import { globalState } from './globalstate'

class BlockStream {
  private streamer: BlockAndLogStreamer<IJSONBlock, IJSONLog>

  private onBlockAddedSubscriptionToken
  private onBlockRemovedSubscriptionToken
  private reconciling

  private pendingTransactions: Array<Promise<any>> = []

  constructor (
    private ourbit: Ourbit,
    private onBlock: (block: BlockstreamBlock) => () => Promise<any>,
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
      let i = startBlockNumber.clone()
      while (i.lt(latestBlockNumber)) {
        const block = await globalState.api.getBlockByNumber(i)
        console.log(`[fast-forward] block ${block.number} (${block.hash})`)
        i = i.add(toBN(1))
        await this.streamer.reconcileNewBlock(block)
        latestBlockNumber = toBN((await globalState.api.getLatestBlock()).number)
      }
    }

    this.beginTracking()
  }

  public stop = async () => {
    clearInterval(this.reconciling)
    this.streamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken)
    this.streamer.unsubscribeFromOnBlockRemoved(this.onBlockRemovedSubscriptionToken)
    await Promise.all(this.pendingTransactions)
  }

  private onBlockAdd = (block: BlockstreamBlock) => {
    console.log(`[onBlockAdd] ${block.number} (${block.hash})`)
    const pendingTransaction = this.ourbit.processTransaction(
      block.hash,
      this.onBlock(block),
    )
    this.pendingTransactions.push(pendingTransaction)
  }

  private onBlockInvalidated = (block: BlockstreamBlock) => {
    console.log(`[onBlockInvalidated] ${block.number} (${block.hash})`)
    const pendingTransaction = this.ourbit.rollbackTransaction(block.hash)
    this.pendingTransactions.push(pendingTransaction)
  }

  private beginTracking = () => {
    // @TODO - replace this with a filter
    this.reconciling = setInterval(async () => {
      await this.streamer.reconcileNewBlock(await globalState.api.getLatestBlock())
    }, this.interval)
  }
}

export default BlockStream
