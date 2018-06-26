import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:api')

import BN = require('bn.js')
import {
  FilterOptions,
} from 'ethereumjs-blockstream'

import { IJSONBlock } from '../models/Block'
import { IJSONExternalTransactionReceipt } from '../models/ExternalTransaction'
import { IJSONInternalTransaction } from '../models/InternalTransaction'
import { IJSONLog } from '../models/Log'
import IIngestApi from './IngestApi'

import {
  cacheApiRequest,
  fetchWithRetry
} from '../utils'

export default class Web3Api implements IIngestApi {

  private doFetch = cacheApiRequest(
    async (method: string, params: any[] = []): Promise<any> => {
      const data = await fetchWithRetry(this.nodeEndpoint, {
        method: 'POST',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      })
      return data.result
    },
  )

  public constructor (
    private nodeEndpoint: string,
  ) {
  }

  public getBlockByNumber = async (num: BN): Promise<IJSONBlock> => {
    debug('[getBlockByNumber] %s %s', num.toString(10), `0x${num.toString(16)}`)
    return this.doFetch('eth_getBlockByNumber', [`0x${num.toString(16)}`, true])
  }

  public getBlockByHash = async (hash: string): Promise<IJSONBlock | null> => {
    debug('[getBlockByHash] %s', hash)
    return this.doFetch('eth_getBlockByHash', [hash, true])
  }

  public getLogs = async (filterOptions: FilterOptions): Promise<IJSONLog[]> => {
    debug('[getLogs] %j', filterOptions)
    return this.doFetch('eth_getLogs', [filterOptions])
  }

  public getLatestBlock = async (): Promise<IJSONBlock> => {
    debug('[getLatestBlock]')
    return this.doFetch('eth_getBlockByNumber', ['latest', true])
  }

  public getTransactionReciept = async (hash: string): Promise<IJSONExternalTransactionReceipt> => {
    return this.doFetch('eth_getTransactionReceipt', [hash])
  }

  public traceTransaction = async (hash: string): Promise<IJSONInternalTransaction[]> => {
    return (await this.doFetch('trace_replayTransaction', [hash, ['trace']])).trace
  }
}
