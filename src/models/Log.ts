import { hexToBigNumber } from '../utils'
import Transaction from './Transaction'

export interface IJSONLog {
  address: string
  topics: string[]
  data: string
  blockNumber: string
  blockHash: string
  transactionHash: string
  transactionIndex: string
  logIndex: string
  removed: boolean
}

export default class Log {
  public readonly logIndex: BigNumber
  public readonly blockNumber: BigNumber
  public readonly blockHash: string
  public readonly transactionHash: string
  public readonly transactionIndex: BigNumber
  public readonly address: string
  public readonly data: string
  /**
   * topics is an array of length [0, 4]
   * that has the indexed arguments from your event
   * in solidity, the first argument is always the hash of the event signature
   * (this way it's easy to make a logFilter for events of a certain type)
   */
  public readonly topics: string[]
  public readonly event: string
  public readonly args: object

  private transaction: Transaction

  public constructor (tx: Transaction, log: IJSONLog) {
    this.transaction = tx

    this.logIndex = hexToBigNumber(log.logIndex)
    this.blockNumber = hexToBigNumber(log.blockNumber)
    this.blockHash = log.blockHash
    this.transactionHash = log.transactionHash
    this.transactionIndex = hexToBigNumber(log.transactionIndex)
    this.address = log.address
    this.data = log.data
    this.topics = log.topics
    // @TODO - parse these out
    // this.event = log.event
    // this.args = log.args
  }
}
