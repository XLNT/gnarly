import Log, { IJSONLog } from './Log'

import { Transaction as BlockstreamTransaction } from 'ethereumjs-blockstream'
import { hexToBigNumber } from '../utils'

export interface IJSONTransaction {
  nonce: string
  transactionHash: string
  transactionIndex: string
  blockNumber: string
  blockHash: string
  cumulativeGasUsed: string
  gasUsed: string
  contractAddress: string | null
  logs: IJSONLog[]
  logsBloom: string
  status: number

  from: string
  to: string
  value: string
  gasPrice: string
  gas: string
  input: string
}

export default class Transaction {
  public nonce: BigNumber
  public hash: string
  public index: BigNumber
  public blockNumber: BigNumber
  public blockHash: string
  public cumulativeGasUsed: BigNumber
  public gasUsed: BigNumber
  public contractAddress: string | null
  public logs: Log[]
  public logsBloom: string
  public status: number

  public from: string
  public to: string
  public value: BigNumber
  public gasPrice: BigNumber
  public gas: BigNumber
  public input: string

  public constructor (tx: IJSONTransaction) {
    this.setSelf(tx)
  }

  public pullLogs = async () => {
    // get transaction reciept then set self and return
    console.log('pull logs')
  }

  private setSelf = (tx: IJSONTransaction) => {
    this.nonce = hexToBigNumber(tx.nonce)
    this.hash = tx.transactionHash
    this.index = hexToBigNumber(tx.transactionIndex)
    this.blockNumber = hexToBigNumber(tx.blockNumber)
    this.blockHash = tx.blockHash
    this.cumulativeGasUsed = hexToBigNumber(tx.cumulativeGasUsed)
    this.gasUsed = hexToBigNumber(tx.gasUsed)
    this.contractAddress = tx.contractAddress
    this.logs = tx.logs.map((l) => new Log(l))
  }
}
