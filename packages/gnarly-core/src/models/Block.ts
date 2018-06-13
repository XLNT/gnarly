import BN = require('bn.js')
import pMap from 'p-map'

import ExternalTransaction, {
  IJSONExternalTransaction,
} from './ExternalTransaction'
import Transaction from './Transaction'

import { toBN } from '../utils'

export interface IJSONBlock {
  number: string
  hash: string
  parentHash: string
  nonce: string
  sha3Uncles: string
  logsBloom: string
  transactionsRoot: string
  stateRoot: string
  miner: string
  difficulty: string
  totalDifficulty: string
  extraData: string
  size: string
  gasLimit: string
  gasUsed: string
  timestamp: string
  transactions: IJSONExternalTransaction[]
  uncles: string[]
}

export default class Block {
  public number: BN
  public hash: string
  public parentHash: string
  public nonce: BN
  public sha3Uncles: string
  public logsBloom: string
  public transactionsRoot: string
  public stateRoot: string
  public miner: string
  public difficulty: BN
  public totalDifficulty: BN
  public extraData: string
  public size: BN
  public gasLimit: BN
  public gasUsed: BN
  public timestamp: BN
  public transactions: ExternalTransaction[]
  public allTransactions: Transaction[]
  public uncles: string[]

  public constructor (block: IJSONBlock) {
    this.number = toBN(block.number)
    this.hash = block.hash
    this.parentHash = block.parentHash
    this.nonce = toBN(block.nonce)
    this.sha3Uncles = block.sha3Uncles
    this.logsBloom = block.logsBloom
    this.transactionsRoot = block.transactionsRoot
    this.stateRoot = block.stateRoot
    this.miner = block.miner
    this.difficulty = toBN(block.difficulty)
    this.totalDifficulty = toBN(block.totalDifficulty)
    this.extraData = block.extraData
    this.size = toBN(block.extraData)
    this.gasLimit = toBN(block.gasLimit)
    this.gasUsed = toBN(block.gasUsed)
    this.timestamp = toBN(block.timestamp)
    this.transactions = block.transactions
      .map((t) => new ExternalTransaction(this, t))
    this.uncles = block.uncles
  }

  public loadTransactions = async (): Promise<void> => {
    await pMap(
      this.transactions,
      async (t) => t.getReceipt(),
      { concurrency: 20 },
    )
  }

  public loadAllTransactions = async (): Promise<void> => {
    await pMap(
      this.transactions,
      async (t) => t.getInternalTransactions(),
      { concurrency: 20 },
    )
    // this looks dumb, but just combines all of the external
    //  and internal transactions in one single 1-dimensional list
    //  for easy iteration
    this.allTransactions = [].concat(
      ...this.transactions,
      [].concat(
        ...this.transactions
          .map((t) => t.internalTransactions),
      ),
    )
  }
}
