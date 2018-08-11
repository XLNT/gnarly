import BN = require('bn.js')
import {
  FilterOptions,
} from 'ethereumjs-blockstream'

import IIngestApi from '../../src/ingestion/IngestApi'
import { IJSONBlock } from '../../src/models/Block'
import { IJSONExternalTransactionReceipt } from '../../src/models/ExternalTransaction'
import { IJSONInternalTransaction } from '../../src/models/InternalTransaction'
import { IJSONLog } from '../../src/models/Log'

import IJSONBlockFactory from '../factories/IJSONBlockFactory'
import IJSONExternalTransactionReceiptFactory from '../factories/IJSONExternalTransactionReceiptFactory'
import IJSONInternalTransactionFactory from '../factories/IJSONInternalTransactionFactory'
import IJSONLogFactory from '../factories/IJSONLogFactory'

export default class MockIngestApi implements IIngestApi {

  constructor (
    private numLogs = 4,
    private numInternalTxs = 4,
  ) {

  }

  public getBlockByNumber = (num: BN): Promise<IJSONBlock> => {
    return IJSONBlockFactory.build({ number: num.toString() })
  }

  public getBlockByHash = (hash: string): Promise<IJSONBlock> => {
    return IJSONBlockFactory.build({ hash })
  }

  public getLogs = (filterOptions: FilterOptions): Promise<IJSONLog[]> => {
    return IJSONLogFactory.buildList(this.numLogs)
  }

  public getLatestBlock = (): Promise<IJSONBlock> => {
    return IJSONBlockFactory.build()
  }

  public getTransactionReceipt = (hash: string): Promise<IJSONExternalTransactionReceipt> => {
    return IJSONExternalTransactionReceiptFactory.build({ hash, logs: IJSONLogFactory.buildList(this.numLogs) })
  }

  public traceTransaction = (hash: string): Promise<IJSONInternalTransaction[]> => {
    return IJSONInternalTransactionFactory.buildList(this.numInternalTxs, { hash })
  }
}
