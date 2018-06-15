import Block from '../models/Block'
import { IOperation, IReason, OpCollector } from '../ourbit/types'
import { ITypeStore } from '../typeStore'

export enum ReducerType {
  /**
   * Idempotent reducers don't care about _when_ they are called.
   * While the original state may vary with time, the function of (state) => nextState does _not_.
   *
   * This reducer type is only called once per-block when the blockstream is fully synced
   * (because executing it before then is a waste).
   *
   * This is most useful for simple getters/computed values from smart contract state
   *  (like querying a specific user's token balance(s)).
   */
  Idempotent = 'IDEMPOTENT',

  /**
   * TimeVarying reducers care about the time at which they are called. The original state
   * may vary with time, and that information cannot be lost.
   *
   * This reducer is called once per-block for every block gnarly ingests.
   *
   * This is most useful for things where the history of state is derived
   *  (like transaction history or art provenance).
   */
  TimeVarying = 'TIME_VARYING',

  /**
   * Atomic reducers do not use time-sensitive values in their derivations, but require state
   * produced during every block. This means they can be run in parallel.
   *
   * NOTE: currently an Atomic reducer is === TimeVarying, but may be optimized to run in parallel
   *   in the future.
   *
   * This type of reducer is called once per-block and produces an atomic operation.
   *
   * This is most useful for traditional maps and reductions of state ala MapReduce
   *  (like keeping track of total transaction count).
   */
  Atomic = 'ATOMIC',
}

export interface IReducerConfig {
  /**
   * The type of reducer (how and when is it called?)
   */
  type: ReducerType,

  /**
   * The name of the reducer in the root state.
   */
  key: string

  /**
   * The typestore to persist the reducer's state
   */
  typeStore: ITypeStore
}

type voidFunc = () => void

/**
 * Function in charge of generating queued patches
 */
export type PatchGenerator = voidFunc
/**
 * Functiont that performs operations on the state where patch order is important
 */
export type OperationPerformerFn = voidFunc
/**
 * The operation() function that accepts a performer
 */
export type OperationFn = (fn: OperationPerformerFn) => void
/**
 * The emit() function that accepts a direct operation
 */
export type EmitOperationFn = (operation: IOperation) => void
/**
 * The because() function that accepts a reason and a operation performer
 */
export type BecauseFn = (reason: string, meta: any, fn: OperationPerformerFn) => void

export interface IReducerUtils {
  emit: EmitOperationFn
  because: BecauseFn
  operation: OperationFn
}

/**
 * The reduce function takes state and block and produces action (implicit)
 */
export type TransactionProducer = (
  state: object,
  block: Block,
  utils: IReducerUtils,
) => Promise<void>

export interface IReducer {
  config: IReducerConfig
  state: object,
  reduce: TransactionProducer
}
