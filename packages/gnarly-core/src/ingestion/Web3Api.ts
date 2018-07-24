import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:api')

import BN = require('bn.js')
import {
  FilterOptions,
} from 'ethereumjs-blockstream'
import pRetry = require('p-retry')

import { IJSONBlock } from '../models/Block'
import { IJSONExternalTransactionReceipt } from '../models/ExternalTransaction'
import { IJSONInternalTransaction } from '../models/InternalTransaction'
import { IJSONLog } from '../models/Log'
import IIngestApi from './IngestApi'

import {
  cacheApiRequest,
} from '../utils'

export default class Web3Api implements IIngestApi {

  private doFetch = cacheApiRequest(
    (method: string, params: any[] = []) => pRetry(
      async () => {
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
        if (data.result === undefined || data.result === null) {
          throw new Error(`
            Invalid JSON response: ${JSON.stringify(data, null, 2)}
            for ${method} ${JSON.stringify(params, null, 2)}
            Retrying...
          `)
        }

        return data.result
      }, {
        retries: this.maxRetries,
        minTimeout: this.minTimeout,
      },
    )
    .catch((error: Error) => {
      throw new Error(`Web3Api#fetch failed after ${this.maxRetries} retries: ${error.stack}`)
    }),
  )

  public constructor (
    private nodeEndpoint: string,
    public maxRetries = 5,
    public minTimeout = 100,
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

  public getTransactionReceipt = async (hash: string): Promise<IJSONExternalTransactionReceipt> => {
    return this.doFetch('eth_getTransactionReceipt', [hash])
  }

  public traceTransaction = async (hash: string): Promise<IJSONInternalTransaction[]> => {
    return (await this.doFetch('trace_replayTransaction', [hash, ['trace']])).trace
  }
}
