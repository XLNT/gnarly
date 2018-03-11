import 'isomorphic-fetch'

import {
  Block as BlockstreamBlock,
  BlockAndLogStreamer,
  FilterOptions,
  Log as BlockstreamLog,
} from 'ethereumjs-blockstream'

import { EventEmitter } from 'events'
import Ourbit from './Ourbit'

const gettersWithWeb3 = (nodeEndpoint) => ({
  getBlockByHash: async (hash: string): Promise<BlockstreamBlock | null > => {
    const res = await fetch(nodeEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByHash', params: [hash, true] }),
    })
    return res.json()
  },
  getLogs: async (filterOptions: FilterOptions): Promise<BlockstreamLog[]> => {
    const res = await fetch(nodeEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getLogs', params: [filterOptions] }),
    })
    return res.json()
  },
  getLatestBlock: async (): Promise<BlockstreamBlock> => {
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

  private pendingTransactions: Array<Promise<any>> = []

  constructor (
    private nodeEndpoint: string,
    private ourbit: Ourbit,
    private onBlock: (block: any) => void,
    private interval: number = 1000,
  ) {
    super()
  }

  public start () {
    const getters = gettersWithWeb3(this.nodeEndpoint)
    this.streamer = new BlockAndLogStreamer(getters.getBlockByHash, getters.getLogs, {
      blockRetention: 100,
    })

    this.onBlockAddedSubscriptionToken = this.streamer.subscribeToOnBlockAdded(this.onBlockAdd)
    this.onBlockRemovedSubscriptionToken = this.streamer.subscribeToOnBlockRemoved(this.onBlockInvalidated)

    // @TODO - replace this with a filter
    this.reconciling = setInterval(async () => {
      this.streamer.reconcileNewBlock(await getters.getLatestBlock())
    }, this.interval)
  }

  public async stop () {
    clearInterval(this.reconciling)
    this.streamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken)
    this.streamer.unsubscribeFromOnBlockRemoved(this.onBlockRemovedSubscriptionToken)
    await Promise.all(this.pendingTransactions)
  }

  private onBlockAdd (data) {
    console.log(data)
    const block = data.result
    const pendingTransaction = this.ourbit.processTransaction(block.id, this.onBlock(block))
    this.pendingTransactions.push(pendingTransaction)
  }

  private onBlockInvalidated (data) {
    console.log(data)
    const block = data.result
    const pendingTransaction = this.ourbit.rollbackTransaction(block.id)
    this.pendingTransactions.push(pendingTransaction)
  }
}

export default BlockStream
