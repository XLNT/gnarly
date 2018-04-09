import Transaction, { IJSONTransaction } from './Transaction'

import { Block as BlockstreamBlock } from 'ethereumjs-blockstream'

import { hexToBigNumber } from '../utils'

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
  transactions: IJSONTransaction[]
  uncles: string[]
}

export default class Block {
  public number: BigNumber
  public hash: string
  public parentHash: string
  public nonce: BigNumber
  public sha3Uncles: string
  public logsBloom: string
  public transactionsRoot: string
  public stateRoot: string
  public miner: string
  public difficulty: BigNumber
  public totalDifficulty: BigNumber
  public extraData: string
  public size: BigNumber
  public gasLimit: BigNumber
  public gasUsed: BigNumber
  public timestamp: BigNumber
  public transactions: Transaction[]
  public uncles: string[]

  public constructor (block: IJSONBlock) {
    this.number = hexToBigNumber(block.number)
    this.hash = block.hash
    this.parentHash = block.parentHash
    this.nonce = hexToBigNumber(block.nonce)
    this.sha3Uncles = block.sha3Uncles
    this.logsBloom = block.logsBloom
    this.transactionsRoot = block.transactionsRoot
    this.stateRoot = block.stateRoot
    this.miner = block.miner
    this.difficulty = hexToBigNumber(block.difficulty)
    this.totalDifficulty = hexToBigNumber(block.totalDifficulty)
    this.extraData = block.extraData
    this.size = hexToBigNumber(block.extraData)
    this.gasLimit = hexToBigNumber(block.gasLimit)
    this.gasUsed = hexToBigNumber(block.gasUsed)
    this.timestamp = hexToBigNumber(block.timestamp)
    this.transactions = block.transactions.map((t) => new Transaction(t))
    this.uncles = block.uncles
  }
}
