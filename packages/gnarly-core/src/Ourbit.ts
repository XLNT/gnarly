import {
  applyPatch,
  generate,
  observe,
  Operation,
  unobserve,
} from 'fast-json-patch'

import _ = require('lodash')
import * as uuid from 'uuid'
import { globalState } from './globalstate'
import { invertPatch, operationsOfPatches, toOperation } from './utils'

/*
 * ourbit:
 * a transaction is a discrete set of events that produce patches to the state
 *   but should be treated as a single unit that can be reverted.
 *   One transaction can produce multiple events that can produce multiple patches.
 * tx => [event]
 * event => [patch]
 * tx_id = uuid for each transaction(), by which patches are indexed
 *
 * when using gnarly with blockchains, tx_id === block_hash
 *
 * ourbit should;
 *  - handle resuming itself from either null, or some tx_id
 *    - pulling patches from that tx_id and apply them over provided initialState
 *    - ourbit = new Ourbit(stateReference, storeInterface)
 *    - ourbit.applyPatchesFrom(tx_id = null)
 *  - accept transaction stream, calls the provided reducer over those events
 *    - processTransaction(tx_id, (stateReference) => {
 *        because(reason, () => {
 *          // do obj manipulation
 *        })
 *      })
 *  - handle persisting patches as they're produced (solid-state-interpreter-ing)
 *    - onPatch(storeInterface, (patch) => { storeInterface.persistPatch(tx_id) })
 *  - handle rollbacks
 *    - urbit.rollback(tx_id)
 *      (applyPatch(stateReference, reversePatchesByTxId(tx_id)))
 */

/**
 * An Operation is a state transition.
 * It is invertable via oldValue.
 * If it is volatile, it is not persisted in memory and is handled differently.
 */
export interface IOperation {
  path: string,
  op: 'add' | 'replace' | 'remove' | 'move' | 'copy' | 'test' | '_get',
  // ^ we will only actually have add|replace|remove
  // but fast-json-patch expects this type so whatever
  value?: any,
  oldValue?: any,
  volatile: boolean
}

/**
 * a gnarly-specific path generated from patch.op.path
 */
export interface IPathThing {
  scope: string
  tableName: string
  pk: string
  indexOrKey: string
}

/**
 * A Patch is a set of operations with a unique id and a reason for their existence.
 */
export interface IPatch {
  id: string
  reason?: { key: string, meta?: any }
  operations: IOperation[],
}

/**
 * A transaction is a set of patches.
 */
export interface ITransaction {
  id: string
  blockHash: string,
  patches: IPatch[]
}

export type TypeStorer = (txId: string, patch: IOperation) => Promise<void>
export type SetupFn = (reset: boolean) => Promise<any>
export interface ITypeStore {
  [_: string]: { // reducer
    [_: string]: TypeStorer | SetupFn,
  }
}
export type OpCollector = (op: IOperation) => void

export interface IPersistInterface {
  // transaction storage
  // @TODO - how do you get typescript to stop complaining about AsyncIterator symbols?
  getAllTransactionsTo (toTxId: null | string): Promise<any>
  getLatestTransaction (): Promise<ITransaction>
  deleteTransaction (tx: ITransaction): Promise<any>
  saveTransaction (tx: ITransaction): Promise<any>
  getTransaction (txId: string): Promise<ITransaction>

  // event log CRUD actions

  // setup
  setup (reset: boolean): Promise<any>
}

interface ITxExtra {
  blockHash: string
}

/**
 * This function accept patches and persists them to a store.
 */
type PersistPatchHandler = (txId: string, patch: IPatch) => Promise<void>

class Ourbit {
  constructor (
    public targetState: object,
    public store: IPersistInterface,
    private persistPatch: PersistPatchHandler,
  ) {
  }

  /**
   * Tracks and perists patches (created by fn) by txId
   * @param txId transaction id
   * @param fn mutating function
   */
  public processTransaction = async (
    txId: string,
    fn: () => Promise<void>,
    extra: ITxExtra = { blockHash: '' },
  ) => {
    const patches: IPatch[] = []

    // watch for patches to the memory state
    const observer = observe(this.targetState, (ops) => {
      patches.push({
        id: uuid.v4(),
        operations: ops.map((op) => ({
          ...op,
          volatile: false,
        })),
        reason: globalState.getReason(),
      })
    })

    // allow reducer to force-collect patches for order-dependent operations
    globalState.setPatchGenerator(() => {
      generate(observer)
    })

    // collect any operations that are directly emitted
    globalState.setOpCollector((op: IOperation) => {
      patches.push({
        id: uuid.v4(),
        operations: [{
          ...op,
          volatile: true,
        }],
        reason: globalState.getReason(),
      })
    })

    // produce operations
    await fn()

    // unobserve
    unobserve(this.targetState, observer)

    // commit transaction
    await this.commitTransaction({
      id: txId,
      patches,
      ...extra,
    })
  }

  /**
   * Applys inverse patches from a specific transaction, mutating the target state
   * @TODO(shrugs) - make this a "fix-forward" operation and include event log
   * @param txId transaction id
   */
  public rollbackTransaction = async (txId: string) => {
    const tx = await this.store.getTransaction(txId)
    await this.uncommitTransaction(tx)
  }

  /**
   * Replays all patches on the targetState from txId
   * @param txId transaction id
   */
  public async resumeFromTxId (txId: string) {
    console.log(`[ourbit] Resuming from txId ${txId}`)
    const allTxs = await this.store.getAllTransactionsTo(txId)
    let totalPatches = 0
    for await (const batch of allTxs) {
      const txBatch = batch as ITransaction[]
      txBatch.forEach((tx) => {
        totalPatches += tx.patches.length
        console.log('[applyPatch]', tx.id, tx.patches.length)
        const allOperations = operationsOfPatches(tx.patches)
        applyPatch(this.targetState, allOperations.map(toOperation))
      })
    }
    console.log(`[ourbit] finished applying ${totalPatches} patches`)
  }

  private notifyPatches = async (txId: string, patches: IPatch[]) => {
    for (const patch of patches) {
      await this.persistPatch(txId, patch)
    }
  }

  private commitTransaction = async (tx: ITransaction) => {
    // save transaction
    await this.store.saveTransaction(tx)
    // apply to store
    await this.notifyPatches(tx.id, tx.patches)
    // (no need to apply locally because they've been applied by the reducer)
  }

  private uncommitTransaction = async (tx: ITransaction) => {
    // @TODO(shrugs) - replace this with something like
    // this.commitTransaction(invertTransaction(tx))

    // construct inverse patches
    const inversePatches = tx.patches.map(invertPatch)
    const inverseOperations = operationsOfPatches(inversePatches)
    // apply locally
    applyPatch(this.targetState, inverseOperations.map(toOperation))
    // apply to store
    await this.notifyPatches(tx.id, inversePatches)
    // delete transaction
    await this.store.deleteTransaction(tx)
  }
}

export default Ourbit
