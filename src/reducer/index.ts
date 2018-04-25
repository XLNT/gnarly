import { IModelType, IStateTreeNode, types } from 'mobx-state-tree'
import Block from '../models/Block'

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
}

/**
 * The reduce function takes state and block and produces action (implicit)
 */
export type TransactionProducer = (state: IStateTreeNode, block: Block) => Promise<void>

export default interface IReducer {
  config: IReducerConfig
  stateType: IModelType<any, any>
  reduce: TransactionProducer
}

/**
 * Using the type information from the reducers array, build a root store
 * and a stateReference to that root store.
 */
export const makeStateReference = (reducers: IReducer[]): IStateTreeNode => {
  const storeTyping = reducers.reduce((memo, r) => ({
    ...memo,
    [r.config.key]: types.optional(r.stateType, {}),
  }), {})

  const Store = types.model('Store', storeTyping)

  const storeValues = reducers.reduce((memo, r) => ({
    ...memo,
    [r.config.key]: r.stateType.create(),
  }), {})

  return Store.create(storeValues)
}
