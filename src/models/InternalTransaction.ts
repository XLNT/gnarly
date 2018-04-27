import BN = require('bn.js')

import { toBN } from '../utils'
import ExternalTransaction from './ExternalTransaction'
import Transaction from './Transaction'

export interface IJSONInternalTransaction {
  action: {
    callType: string,
    from: string,
    gas: string,
    input: string,
    to: string,
    value: string,
  }
  // blockHash: string
  // blockNumber: string
  result: {
    gasUsed: string,
    output: string,
  }
  subtraces: number
  /**
   * traceAddress field
   * The traceAddress field of all returned traces, gives the exact location in
   * the call trace [index in root, index in first CALL, index in second CALL, …].
   *    i.e. if the trace is:
   * A
   *  CALLs B
   *    CALLs G
   *  CALLs C
   *    CALLs G
   *
   * then it should look something like:
   *
   * [ {A: []}, {B: [0]}, {G: [0, 0]}, {C: [1]}, {G: [1, 0]} ]
   */
  traceAddress: number[]
  // transactionHash: string
  // transactionPosition: string
  type: string
  error: string | null
}

export const isInternalTransaction = (obj: any): obj is InternalTransaction => 'internal' in obj

export default class InternalTransaction extends Transaction {
  public internal: boolean = true

  public transaction: ExternalTransaction

  public callType: string

  public blockHash: string
  public blockNumber: BN
  public result: {
    gasUsed: BN,
    output: string,
  }
  public subtraces: number
  public traceAddress: number[]
  public transactionHash: string
  // public transactionPosition: string
  public type: string
  // ^ "call" | ??

  public error: string | null = null

  constructor (tx: ExternalTransaction, itx: IJSONInternalTransaction) {
    super()

    this.transaction = tx
    this.callType = itx.action.callType
    this.from = itx.action.from
    this.to = itx.action.to
    // @TODO(shrugs) - contractAddress for deploys?
    this.input = itx.action.input
    this.from = itx.action.from
    this.gas = toBN(itx.action.gas)
    this.value = toBN(itx.action.value)
    this.blockHash = tx.blockHash
    this.blockNumber = tx.blockNumber

    this.subtraces = itx.subtraces
    this.traceAddress = itx.traceAddress
    this.transactionHash = tx.hash

    // this.transactionPosition = tx.trans
    this.type = itx.type

    if (itx.error !== undefined) {
      this.error = itx.error
      return
    }

    this.result = {
      ...itx.result,
      gasUsed: toBN(itx.result.gasUsed),
    }

    // invariant: itx.transactionHash === this.transaction.hash
  }
}
