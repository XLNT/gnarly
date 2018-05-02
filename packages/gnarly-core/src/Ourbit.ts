import { transaction } from 'mobx'
import {
  applyPatch,
  getSnapshot,
  IJsonPatch,
  IStateTreeNode,
  onPatch,
  onSnapshot,
  types,
} from 'mobx-state-tree'

import {
  splitPath,
} from './utils'

import * as uuid from 'uuid'
import { globalState } from './globalstate'

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
 *          // do mobx manipulation
 *        })
 *      })
 *  - handle persisting patches as they're produced (solid-state-interpreter-ing)
 *    - mobx.onPatch(storeInterface, (patch) => { storeInterface.persistPatch(tx_id) })
 *  - handle rollbacks
 *    - urbit.rollback(tx_id)
 *      (mobx.applyPatch(stateReference, reversePatchesByTxId(tx_id)))
 */

export interface IPatch extends IJsonPatch, IPathThing {
  id: string
}

export interface ITransaction {
  id: string
  patches: IPatch[]
  inversePatches: IPatch[]
}

export interface IPathThing {
  reducerKey: string
  domainKey: string
  key: string
  extra: string[]
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

type PersistPatchHandler = (txId: string, patch: IPatch) => Promise<void>

class Ourbit {
  public targetState: IStateTreeNode
  public store: IPersistInterface
  private persistPatch: PersistPatchHandler

  private skipping: boolean = false

  constructor (
    targetState: IStateTreeNode,
    store: IPersistInterface,
    persistPatch: PersistPatchHandler,
  ) {
    this.targetState = targetState
    this.store = store
    this.persistPatch = persistPatch
  }

  /**
   * Tracks and perists patches (created by fn) by txId
   * @param txId transaction id
   * @param fn mutating function
   */
  public processTransaction = async (txId: string, fn: () => Promise<void>) => {
    const patches = []
    const inversePatches = []

    const collectPatches = (patch: IJsonPatch, inversePatch: IJsonPatch) => {
      // we have access to reason and meta here, thanks to the global
      // so we need to log that in the database to track why patches were made
      // // do we need to replace the json blob with a linked array of
      // patches? how do we link the artifact with the event log?
      // console.log(globalState.currentReason)
      const patchId = uuid.v4()
      const pathParts = splitPath(patch.path)

      // parse storeKey and keyKey from path and provide to patch
      patches.push({
        ...patch,
        id: patchId,
        ...pathParts,
      })
      inversePatches.push({
        ...inversePatch,
        id: patchId,
        ...pathParts,
      })
    }
    // watch for patches
    const dispose = onPatch(
      this.targetState,
      collectPatches,
    )

    // produce state changes
    await fn()

    // dispose watcher
    dispose()

    // commit transaction
    await this.commitTransaction({
      id: txId,
      patches,
      inversePatches,
    })
  }

  /**
   * Applys inverse patches from a specific transaction, mutating the target state
   * @TODO(shrugs) - make this a "fix-forward" operation and include event log
   * @param txId transaction id
   */
  public rollbackTransaction = async (txId: string) => {
    const tx = await this.store.getTransaction(txId)
    applyPatch(this.targetState, tx.inversePatches)
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
      txBatch.forEach((tx) => {
        console.log('[applyPatch]', tx.id, tx.patches.length)
        applyPatch(this.targetState, tx.patches)
      })
    }
  }

  private notifyPatches = async (txId: string, patches: IPatch[]) => {
    for (const patch of patches) {
      await this.persistPatch(txId, patch)
    }
  }

  private commitTransaction = async (tx: ITransaction) => {
    await this.store.saveTransaction(tx)
    await this.notifyPatches(tx.id, tx.patches)
  }

  private uncommitTransaction = async (tx: ITransaction) => {
    await this.store.deleteTransaction(tx)
    await this.notifyPatches(tx.id, tx.inversePatches)
  }
}

export default Ourbit
