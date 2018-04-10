import 'isomorphic-fetch'

import {
  Block as BlockstreamBlock,
  BlockAndLogStreamer,
  Log as BlockstreamLog,
} from 'ethereumjs-blockstream'

import { IJSONBlock } from './models/Block'
import { IJSONLog } from './models/Log'
import NodeApi from './models/NodeApi'

import { EventEmitter } from 'events'
import Ourbit from './Ourbit'

import {
  hexToBigNumber,
} from './utils'

class BlockStream extends EventEmitter {
  private streamer: BlockAndLogStreamer<IJSONBlock, IJSONLog>

  private onBlockAddedSubscriptionToken
  private onBlockRemovedSubscriptionToken
  private reconciling

  private pendingTransactions: Array<Promise<any>> = []

  constructor (
    private api: NodeApi,
    private ourbit: Ourbit,
    private onBlock: (block: BlockstreamBlock) => () => Promise<any>,
    private interval: number = 5000,
  ) {
    super()
  }

  public start = async (fromBlockHash: string = null) => {
    this.streamer = new BlockAndLogStreamer(this.api.getBlockByHash, this.api.getLogs, {
      blockRetention: 100,
    })

    this.onBlockAddedSubscriptionToken = this.streamer.subscribeToOnBlockAdded(this.onBlockAdd)
    this.onBlockRemovedSubscriptionToken = this.streamer.subscribeToOnBlockRemoved(this.onBlockInvalidated)

    let startBlockNumber
    if (fromBlockHash === null) {
      // if no hash provided, we're starting from scratch
      startBlockNumber = hexToBigNumber('0x0')
    } else {
      // otherwise get the expected block's number
      const startFromBlock = await this.api.getBlockByHash(fromBlockHash)
      startBlockNumber = hexToBigNumber(startFromBlock.number).plus(1)
      // ^ +1 because we already know about this block and we want the next
    }

    // get the latest block
    let latestBlockNumber = hexToBigNumber(
      (await this.api.getLatestBlock()).number,
    )

    // if we're not at that block number, start pulling the blocks
    // from before until we catch up, then track latest
    if (latestBlockNumber.gt(startBlockNumber)) {
      console.log(
        `[fast-forward] Starting from ${startBlockNumber.toNumber()} to ${latestBlockNumber.toNumber()}`,
      )
      for (let i = startBlockNumber.toNumber(); i < latestBlockNumber.toNumber(); i++) {
        const block = await this.api.getBlockByNumber(i)
        console.log(`[fast-forward] block ${block.number} (${block.hash})`)
        await this.streamer.reconcileNewBlock(block)
        latestBlockNumber = hexToBigNumber((await this.api.getLatestBlock()).number)
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
      await this.streamer.reconcileNewBlock(await this.api.getLatestBlock())
    }, this.interval)
  }
}

export default BlockStream
