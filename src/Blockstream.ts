import {
  Block as BlockstreamBlock,
  BlockAndLogStreamer,
  FilterOptions,
  Log as BlockstreamLog,
} from 'ethereumjs-blockstream'
import { EventEmitter } from 'events'

class BlockStream extends EventEmitter {
  private streamer
  private onBlockAddedSubscriptionToken
  private onBlockRemovedSubscriptionToken
  private reconciling
  constructor (streamer, getLatestBlock, interval = 1000) {
    super()
    const blockAdd = (data) => this.emit('block:add', data.result)
    const blockInvalidate = (data) => this.emit('block:invalidate', data)

    this.streamer = streamer
    this.onBlockAddedSubscriptionToken = streamer.subscribeToOnBlockAdded(blockAdd)
    this.onBlockRemovedSubscriptionToken = streamer.subscribeToOnBlockRemoved(blockInvalidate)
    this.reconciling = setInterval(async () => {
      streamer.reconcileNewBlock(await getLatestBlock())
    }, interval)
  }

  public close () {
    clearInterval(this.reconciling)
    this.streamer.unsubscribeFromOnBlockAdded(this.onBlockAddedSubscriptionToken)
    this.streamer.unsubscribeFromOnBlockRemoved(this.onBlockRemovedSubscriptionToken)
  }
}

export default (web3Endpoint, interval = 1000) => {
  async function getBlockByHash (hash: string): Promise<BlockstreamBlock | null> {
    const res = await fetch(web3Endpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByHash', params: [hash, true] }),
    })
    return res.json()
  }

  async function getLogs (filterOptions: FilterOptions): Promise<BlockstreamLog[]> {
    const res = await fetch(web3Endpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getLogs', params: [filterOptions] }),
    })
    return res.json()
  }

  async function getLatestBlock (): Promise<BlockstreamBlock> {
    const res = await fetch(web3Endpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBlockByNumber', params: ['latest', true] }),
    })
    return res.json()
  }

  const streamer = new BlockAndLogStreamer(getBlockByHash, getLogs, {
    blockRetention: 100,
  })

  return new BlockStream(streamer, getLatestBlock, interval)
}
