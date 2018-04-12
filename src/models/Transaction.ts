import Block from './Block'
import InternalTransaction from './InternalTransaction'
import Log, { IJSONLog } from './Log'

import { globalState } from '../globalstate'
import { hexToBigNumber } from '../utils'

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

  public nonce: BigNumber
  public hash: string
  public index: BigNumber
  public blockNumber: BigNumber
  public blockHash: string
  public cumulativeGasUsed: BigNumber | null
  public gasUsed: BigNumber
  public contractAddress: string | null
  public logs: Log[]
  public logsBloom: string
  public status: BigNumber

  public from: string
  public to: string
  public value: BigNumber
  public gasPrice: BigNumber
  public gas: BigNumber
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
    console.log('[setReceipt]', txReceipt)
    this.setSelf(txReceipt)
  }

  private setInternalTransactions = async () => {
    try {
      const traces = await globalState.api.traceTransaction(this.hash)
      console.log('[setInternalTransactions]', traces)
      this.internalTransactions = traces.map((itx) => new InternalTransaction(this, itx))
    } catch (error) {
      console.error('[setInternalTransactions] trace_replayTransaction not working, ignoring')
    }
  }

  private setSelf = (tx: IJSONTransactionInfo) => {
    if (isTransaction(tx)) {
      this.nonce = hexToBigNumber(tx.nonce)
      this.hash = tx.hash
      this.index = hexToBigNumber(tx.transactionIndex)
      this.blockNumber = hexToBigNumber(tx.blockNumber)
      this.blockHash = tx.blockHash
      this.from = tx.from
      this.to = tx.to
      this.value = hexToBigNumber(tx.value)
      this.gasPrice = hexToBigNumber(tx.gasPrice)
      this.gas = hexToBigNumber(tx.gas)
      this.input = tx.input
    } else if (isTransactionReceipt(tx)) {
      this.cumulativeGasUsed = hexToBigNumber(tx.cumulativeGasUsed)
      this.gasUsed = hexToBigNumber(tx.gasUsed)
      this.contractAddress = tx.contractAddress
      this.logs = tx.logs.map((l) => new Log(this, l))
      this.status = hexToBigNumber(tx.status)
    } else {
      throw new Error(`Unexpected type ${tx} in Transaction#setSelf()`)
    }
  }
}
