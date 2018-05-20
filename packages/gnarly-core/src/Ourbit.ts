import {
  applyPatch,
  generate,
  observe,
  Operation,
  unobserve,
 } from 'fast-json-patch'

import * as uuid from 'uuid'
import { globalState } from './globalstate'
import { invertPatch, patchToOperation } from './utils'

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
 * a gnarly-specific path generated from patch.op.path
 */
export interface IPathThing {
  scope: string
  tableName: string
  pk: string
  indexOrKey: string
}

/**
 * A full patch is the original patch plus an id and a previous value for inverting.
 */
export interface IPatch {
  id: string
  op: Operation,
  oldValue?: any
}

/**
 * A transaction is a set of patches.
 */
export interface ITransaction {
  id: string
  patches: IPatch[]
}

export type TypeStorer = (txId: string, patch: IPatch) => Promise<void>
export type SetupFn = (reset: boolean) => Promise<any>
export interface ITypeStore {
  [_: string]: { // reducer
    [_: string]: TypeStorer | SetupFn,
  }
}

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
  public processTransaction = async (txId: string, fn: () => Promise<void>) => {
    const operations = []
    // watch for patches
    const observer = observe(this.targetState, (ops) => {
      ops.forEach((op) => { operations.push(op) })
    })

    globalState.setGeneratePatches(() => {
      generate(observer)
    })

    // produce state changes
    await fn()

    // dispose watcher
    unobserve(this.targetState, observer)

    // annotate patches
    const patches = operations.map((op): IPatch => ({
        id: uuid.v4(),
        op,
        // @TODO(shrugs) - add oldValue here
      }))

    // commit transaction
    await this.commitTransaction({
      id: txId,
      patches,
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
    for await (const txBatch of allTxs) {
      (txBatch as ITransaction[]).forEach((tx) => {
        console.log('[applyPatch]', tx.id, tx.patches.length)
        applyPatch(this.targetState, tx.patches.map(patchToOperation))
      })
    }
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
    // construct inverse patches
    const inversePatches = tx.patches.map(invertPatch)
    // apply locally
    applyPatch(this.targetState, inversePatches.map(patchToOperation))
    // apply to store
    await this.notifyPatches(tx.id, inversePatches)
    // delete transaction
    await this.store.deleteTransaction(tx)
  }
}

export default Ourbit
