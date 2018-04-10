import Block from './Block'
import Log, { IJSONLog } from './Log'

import { Transaction as BlockstreamTransaction } from 'ethereumjs-blockstream'
import { transaction } from 'mobx'
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

  public constructor (block: Block, tx: IJSONTransaction) {
    this.block = block

    this.setSelf(tx)
  }

  public getFull = async () => {
    const txReceipt = await this.block.api.getTransactionReciept(this.hash)
    console.log(txReceipt)
    this.setSelf(txReceipt)
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
