import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:ExternalTransaction')

import BN = require('bn.js')

import Block from './Block'
import InternalTransaction from './InternalTransaction'
import Log, { IJSONLog } from './Log'
import Transaction from './Transaction'

import { globalState } from '../globalstate'
import { toBN } from '../utils'

export interface IJSONExternalTransaction {
  hash: string
  nonce: string
  blockHash: string
  blockNumber: string
  transactionIndex: string
  from: string
  to: string
  value: string
  gasPrice: string
  gas: string
  input: string
}

export interface IJSONExternalTransactionReceipt {
  blockHash: string
  blockNumber: string
  contractAddress: string
  cumulativeGasUsed: string
  from: string
  gasUsed: string
  logs: IJSONLog[]
  logsBloom: string
  status: string
  to: string
  transactionHash: string
  transactionIndex: string
}

export type IJSONExternalTransactionInfo = IJSONExternalTransaction | IJSONExternalTransactionReceipt

// is JSONExternalTransaction if it has a nonce
const isJSONExternalTransaction = (obj: any): obj is IJSONExternalTransaction =>
  'nonce' in obj

  // is a Transaction Receipt if it has a status
const isJSONExternalTransactionReceipt = (obj: any): obj is IJSONExternalTransactionReceipt =>
  'status' in obj

// is an external transaction (vs internal transaction) if it has external property that is truthy
export const isExternalTransaction = (obj: any): obj is ExternalTransaction =>
  'external' in obj && obj.external

export default class ExternalTransaction extends Transaction {
  public external: boolean = true

  public block: Block

  public nonce: BN
  public hash: string
  public index: BN
  public blockNumber: BN
  public blockHash: string
  public cumulativeGasUsed: BN | null
  public logs: Log[]
  public logsBloom: string
  public status: BN
  public contractAddress: string | null
  public gasPrice: BN

  public internalTransactions: InternalTransaction[]

  public constructor (block: Block, tx: IJSONExternalTransaction) {
    super()
    this.block = block

    this.setSelf(tx)
  }

  public getReceipt = async () => {
    await this.getAndSetReceipt()
  }

  public getInternalTransactions = async () => {
    await this.setInternalTransactions()
  }

  private getAndSetReceipt = async () => {
    const txReceipt = await globalState.api.getTransactionReceipt(this.hash)
    this.setSelf(txReceipt)
  }

  private setInternalTransactions = async () => {
    let traces
    try {
      traces = await globalState.api.traceTransaction(this.hash)
      this.internalTransactions = traces.map((itx) => new InternalTransaction(this, itx))
    } catch (error) {
      throw new Error(`IngestAPI#traceTransaction not working: ${error.stack}`)
    }
  }

  private setSelf = (tx: IJSONExternalTransactionInfo) => {
    if (isJSONExternalTransaction(tx)) {
      this.nonce = toBN(tx.nonce)
      this.hash = tx.hash
      this.index = toBN(tx.transactionIndex)
      this.blockNumber = toBN(tx.blockNumber)
      this.blockHash = tx.blockHash
      this.from = tx.from
      this.to = tx.to
      this.value = toBN(tx.value)
      this.gasPrice = toBN(tx.gasPrice)
      this.gas = toBN(tx.gas)
      this.input = tx.input
    } else if (isJSONExternalTransactionReceipt(tx)) {
      this.cumulativeGasUsed = toBN(tx.cumulativeGasUsed)
      this.gasUsed = toBN(tx.gasUsed)
      this.contractAddress = tx.contractAddress
      this.logs = tx.logs.map((l) => new Log(this, l))
      this.status = toBN(tx.status)
    } else {
      throw new Error(`Unexpected type in Transaction#setSelf(): ${JSON.stringify(tx)}`)
    }
  }
}
