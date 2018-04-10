import Block from './Block'
import Log, { IJSONLog } from './Log'

import { Transaction as BlockstreamTransaction } from 'ethereumjs-blockstream'
import { hexToBigNumber } from '../utils'

// this is actually the Blockstream transaction interface
// because idk why it's not just returning the thing directly but whatever
export interface IJSONShortTransaction {
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

export interface IJSONLongTransaction extends IJSONShortTransaction {
  cumulativeGasUsed: string
  gasUsed: string
  contractAddress: string | null
  logs: any[]
  status: string
}

export type IJSONTransaction = IJSONShortTransaction | IJSONLongTransaction

function isLongTransaction (object: any): object is IJSONLongTransaction {
  return 'logs' in object
}

export default class Transaction {

  public block: Block

  public nonce: BigNumber
  public hash: string
  public index: BigNumber
  public blockNumber: BigNumber
  public blockHash: string
  public cumulativeGasUsed: BigNumber
  public gasUsed: BigNumber
  public contractAddress: string | null
  public logs: Log[]
  public status: BigNumber

  public from: string
  public to: string
  public value: BigNumber
  public gasPrice: BigNumber
  public gas: BigNumber
  public input: string

  public constructor (block: Block, tx: IJSONTransaction) {
    this.block = block

    this.setSelf(tx)
  }

  public getFull = async () => {
    this.setSelf(await this.block.api.getTransactionReciept(this.hash))
  }

  private setSelf = (tx: IJSONTransaction) => {
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

    if (isLongTransaction(tx)) {
      this.cumulativeGasUsed = hexToBigNumber(tx.cumulativeGasUsed)
      this.gasUsed = hexToBigNumber(tx.gasUsed)
      this.contractAddress = tx.contractAddress
      this.logs = tx.logs.map((l) => new Log(this, l))
      this.status = hexToBigNumber(tx.status)
    }
  }
}
