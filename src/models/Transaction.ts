import BN = require('bn.js')

import Block from './Block'
import InternalTransaction from './InternalTransaction'
import Log, { IJSONLog } from './Log'

import { globalState } from '../globalstate'
import { toBN } from '../utils'

export interface IJSONTransaction {
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

function isTransaction (obj: any): obj is IJSONTransaction {
  return 'nonce' in obj
}

export interface IJSONTransactionReceipt {
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

function isTransactionReceipt (obj: any): obj is IJSONTransactionReceipt {
  return 'status' in obj
}

export type IJSONTransactionInfo = IJSONTransaction | IJSONTransactionReceipt

export default class Transaction {

  public block: Block

  public nonce: BN
  public hash: string
  public index: BN
  public blockNumber: BN
  public blockHash: string
  public cumulativeGasUsed: BN | null
  public gasUsed: BN
  public contractAddress: string | null
  public logs: Log[]
  public logsBloom: string
  public status: BN

  public from: string
  public to: string
  public value: BN
  public gasPrice: BN
  public gas: BN
  public input: string

  public internalTransactions: InternalTransaction[]

  public constructor (block: Block, tx: IJSONTransaction) {
    this.block = block

    this.setSelf(tx)
  }

  public getFull = async () => {
    await this.setReceipt()
    await this.setInternalTransactions()
  }

  private setReceipt = async () => {
    const txReceipt = await globalState.api.getTransactionReciept(this.hash)
    // console.log('[setReceipt]', txReceipt)
    this.setSelf(txReceipt)
  }

  private setInternalTransactions = async () => {
    try {
      const traces = await globalState.api.traceTransaction(this.hash)
      // console.log('[setInternalTransactions]', traces)
      this.internalTransactions = traces.map((itx) => new InternalTransaction(this, itx))
    } catch (error) {
      console.error('[setInternalTransactions] trace_replayTransaction not working, ignoring', error)
    }
  }

  private setSelf = (tx: IJSONTransactionInfo) => {
    if (isTransaction(tx)) {
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
    } else if (isTransactionReceipt(tx)) {
      this.cumulativeGasUsed = toBN(tx.cumulativeGasUsed)
      this.gasUsed = toBN(tx.gasUsed)
      this.contractAddress = tx.contractAddress
      this.logs = tx.logs.map((l) => new Log(this, l))
      this.status = toBN(tx.status)
    } else {
      throw new Error(`Unexpected type ${tx} in Transaction#setSelf()`)
    }
  }
}
