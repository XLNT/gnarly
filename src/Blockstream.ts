import 'isomorphic-fetch'

import {
  Block as BlockstreamBlock,
  BlockAndLogStreamer,
  FilterOptions,
  Log as BlockstreamLog,
} from 'ethereumjs-blockstream'

import { EventEmitter } from 'events'
import Ourbit from './Ourbit'

import {
  hexToBigNumber,
} from './utils'

const gettersWithWeb3 = (nodeEndpoint) => ({
  getBlockByNumber: async (num: number): Promise<BlockstreamBlock> => {
    console.log('[getBlockByNumber]', num)
    const res = await fetch(nodeEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByNumber',
        params: [`0x${num.toString(16)}`, true],
      }),
    })
    return res.json()
  },
  getBlockByHash: async (hash: string): Promise<BlockstreamBlock | null > => {
    console.log('[getBlockByHash]', hash)
    const res = await fetch(nodeEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByHash', params: [hash, true] }),
    })
    return res.json()
  },
  getLogs: async (filterOptions: FilterOptions): Promise<BlockstreamLog[]> => {
    console.log('[getLogs]', filterOptions)
    const res = await fetch(nodeEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getLogs', params: [filterOptions] }),
    })
    return res.json()
  },
  getLatestBlock: async (): Promise<BlockstreamBlock> => {
    console.log('[getLatestBlock]')
    const res = await fetch(nodeEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['latest', true] }),
    })
    return res.json()
  },
})

class BlockStream extends EventEmitter {
  private streamer

  private onBlockAddedSubscriptionToken
  private onBlockRemovedSubscriptionToken
  private reconciling
  private getters

  private pendingTransactions: Array<Promise<any>> = []

  constructor (
    private nodeEndpoint: string,
    private ourbit: Ourbit,
    private onBlock: (block: any) => void,
    private interval: number = 5000,
  ) {
    super()
  }

  public start = async (fromBlockHash: string = null) => {
    this.getters = gettersWithWeb3(this.nodeEndpoint)
    this.streamer = new BlockAndLogStreamer(this.getters.getBlockByHash, this.getters.getLogs, {
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
      const { result: startFromBlock} = await this.getters.getBlockByHash(fromBlockHash)
      startBlockNumber = hexToBigNumber(startFromBlock.number).plus(1)
      // ^ +1 because we already know about this block and we want the next
    }

    // get the latest block
    let latestBlockNumber = hexToBigNumber(
      (await this.getters.getLatestBlock()).result.number,
    )

    // if we're not at that block number, start pulling the blocks
    // from before until we catch up, then track latest
    if (latestBlockNumber.gt(startBlockNumber)) {
      console.log(
        `[fast-forward] Starting from ${startBlockNumber.toNumber()} to ${latestBlockNumber.toNumber()}`,
      )
      for (let i = startBlockNumber.toNumber(); i < latestBlockNumber.toNumber(); i++) {
        const { result: block } = await this.getters.getBlockByNumber(i)
        console.log(`[fast-forward] block ${block.number} (${block.hash})`)
        await this.streamer.reconcileNewBlock(block)
        latestBlockNumber = hexToBigNumber((await this.getters.getLatestBlock()).result.number)
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
    const pendingTransaction = this.ourbit.processTransaction(block.hash, this.onBlock(block))
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
      await this.streamer.reconcileNewBlock(await this.getters.getLatestBlock())
    }, this.interval)
  }
}

export default BlockStream
