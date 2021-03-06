import BN = require('bn.js')
import {
  FilterOptions,
} from 'ethereumjs-blockstream'

import { IJSONBlock } from '../models/Block'
import { IJSONExternalTransactionReceipt } from '../models/ExternalTransaction'
import { IJSONLog } from '../models/Log'

import { IJSONInternalTransaction } from '../models/InternalTransaction'

export type DecomposeFn = () => void

export default interface IIngestApi {
  /**
   * gets a block by number
   * @return IJSONBLock
   * @throws
   */
  getBlockByNumber: (num: BN) => Promise<IJSONBlock>

  /**
   * gets a block by hash
   * @return IJSONBlock
   * @throws
   */
  getBlockByHash: (hash: string) => Promise<IJSONBlock>

  /**
   * get the latest block
   * @returns IJSONBlock
   * @throws
   */
  getLatestBlock: () => Promise<IJSONBlock>

  /**
   * gets logs from filter options
   * @returns IJSONLog[]
   * @throws
   */
  getLogs: (filterOptions: FilterOptions) => Promise<IJSONLog[]>

  /**
   * gets tx receipt
   * @returns IJSONExternalTransactionReceipt
   * @throws
   */
  getTransactionReceipt: (hash: string) => Promise<IJSONExternalTransactionReceipt>

  /**
   * traces a transaction (parity format)
   * @returns IJSONInternalTransaction
   * @throws
   */
  traceTransaction: (hash: string) => Promise<IJSONInternalTransaction[]>

  /**
   * subscribes to new atomic events (blocks, when using a blockchain)
   * @returns decomposer fn
   */
  subscribeToNewBlocks: (cb) => DecomposeFn
}
