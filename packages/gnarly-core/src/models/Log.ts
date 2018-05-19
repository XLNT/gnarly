import BN = require('bn.js')
import abi = require('web3-eth-abi')

import { globalState } from '../globalstate'

import { toBN } from '../utils'
import ExternalTransaction from './ExternalTransaction'

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
  public readonly logIndex: BN
  public readonly blockNumber: BN
  public readonly blockHash: string
  public readonly transactionHash: string
  public readonly transactionIndex: BN
  public readonly address: string
  public readonly data: string
  /**
   * topics is an array of length [0, 4]
   * that has the indexed arguments from your event
   * in solidity, the first argument is always the hash of the event signature
   * (this way it's easy to make a logFilter for events of a certain type)
   */
  public topics: string[]
  public event: string
  public eventName: string
  public signature: string
  public args: object

  private transaction: ExternalTransaction

  public constructor (tx: ExternalTransaction | null, log: IJSONLog) {
    this.transaction = tx

    this.logIndex = toBN(log.logIndex)
    this.blockNumber = toBN(log.blockNumber)
    this.blockHash = log.blockHash
    this.transactionHash = log.transactionHash
    this.transactionIndex = toBN(log.transactionIndex)
    this.address = log.address
    this.data = log.data
    this.topics = log.topics
  }

  public parse = (): boolean => {
    const registeredAbi = globalState.getABI(this.address)

    if (!registeredAbi) { return false }

    // ^ we do not know about this contract, so we can't try to parse it

    if (this.topics.length === 0) { return false }
    // ^ there are no topics, which means this is an anonymous event or something

    // the first argument in topics (from solidity) is always the event signature
    const eventSig = this.topics[0]

    // find the inputs by signature
    const logAbiItem = registeredAbi.find((item) => item.signature === eventSig)
    if (logAbiItem === undefined) {
      // ^ we don't have an input that matches this event (incomplete ABI?)
      return false
    }

    const args = abi.decodeLog(
      logAbiItem.inputs,
      this.data,
      this.topics.slice(1),
      // ^ ignore the signature
    )

    this.event = logAbiItem.name
    this.eventName = logAbiItem.fullName
    this.signature = logAbiItem.signature

    this.args = args

    return true
  }
}
