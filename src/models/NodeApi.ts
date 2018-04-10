import { IJSONBlock } from './Block'
import { IJSONLog } from './Log'
import { IJSONLongTransaction } from './Transaction'

import {
  FilterOptions,
} from 'ethereumjs-blockstream'

export default class NodeApi {

  public constructor (
    private nodeEndpoint: string,
  ) {

  }

  public getBlockByNumber = async (num: number): Promise<IJSONBlock> => {
    console.log('[getBlockByNumber]', num)
    return this.doFetch('eth_getBlockByNumber', [`0x${num.toString(16)}`, true])
  }

  public getBlockByHash = async (hash: string): Promise<IJSONBlock | null> => {
    console.log('[getBlockByHash]', hash)
    return this.doFetch('eth_getBlockByHash', [hash, true])
  }

  public getLogs = async (filterOptions: FilterOptions): Promise<IJSONLog[]> => {
    console.log('[getLogs]', filterOptions)
    return this.doFetch('eth_getLogs', [filterOptions])
  }

  public getLatestBlock = async (): Promise<IJSONBlock> => {
    console.log('[getLatestBlock]')
    return this.doFetch('eth_getBlockByNumber', ['latest', true])
  }

  public getTransactionReciept = async (hash: string): Promise<IJSONLongTransaction> => {
    return this.doFetch('eth_getTransactionReceipt', [hash])
  }

  private doFetch = async (method: string, params: any[] = []): Promise<any> => {
    const res = await fetch(this.nodeEndpoint, {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    })
    const data = await res.json()
    return data.result
  }
}
