import { hexToBigNumber } from '../utils'
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
  blockHash: string
  blockNumber: string
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
  transactionHash: string
  transactionPosition: string
  type: string
}

export default class InternalTransaction {
  public transaction: Transaction

  public action: {
    callType: string,
    from: string,
    gas: BigNumber,
    input: string,
    to: string,
    value: BigNumber,
  }
  public blockHash: string
  public blockNumber: BigNumber
  public result: {
    gasUsed: BigNumber,
    output: string,
  }
  public subtraces: number
  public traceAddress: number[]
  public transactionHash: string
  public transactionPosition: string
  public type: string

  constructor (tx: Transaction, itx: IJSONInternalTransaction) {
    this.transaction = tx
    this.action = {
      ...itx.action,
      gas: hexToBigNumber(itx.action.gas),
      value: hexToBigNumber(itx.action.value),
    }
    this.blockHash = itx.blockHash
    this.blockNumber = hexToBigNumber(itx.blockNumber)
    this.result = {
      ...itx.result,
      gasUsed: hexToBigNumber(itx.result.gasUsed),
    }
    this.subtraces = itx.subtraces
    this.traceAddress = itx.traceAddress
    this.transactionHash = itx.transactionHash
    this.transactionPosition = itx.transactionPosition
    this.type = itx.type

    // invariant: itx.transactionHash === this.transaction.hash
  }
}
