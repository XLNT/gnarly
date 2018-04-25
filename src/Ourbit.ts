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
}

export interface ITypeStore {
  [key: string]: {
    [key: string]: (txId: string, patch: IPatch) => Promise<void>,
  }
}

export interface IPersistInterface {
  getTransactions: (fromTxId: null|string) => Promise<ITransaction[]>
  // @TODO ^ make this a generator that batches transaction returns
  getLatestTransaction: () => Promise<ITransaction>

  deleteTransaction: (tx: ITransaction) => Promise<any>
  saveTransaction: (tx: ITransaction) => Promise<any>
  getTransaction: (txId: string) => Promise<ITransaction>

  // event log CRUD actions
}

type PersistPatchHandler = (txId: string, patch: IPatch) => Promise<void>

class Ourbit {
  public targetState: IStateTreeNode
  public store: IPersistInterface
  private persistPatch: PersistPatchHandler

  private skipping: boolean = false

  private patches = []
  private inversePatches = []

  constructor (
    targetState: IStateTreeNode,
    store: IPersistInterface,
    persistPatch: PersistPatchHandler,
  ) {
    this.targetState = targetState
    this.store = store
    this.persistPatch = persistPatch

    onPatch(this.targetState, this.handlePatch)
  }

  /**
   * Tracks and perists patches (created by fn) by txId
   * @param txId transaction id
   * @param fn mutating function
   */
  public processTransaction = async (txId: string, fn: () => void) => {
    transaction(() => {
      fn()
    })

    await this.commitTransaction({
      id: txId,
      patches: this.patches,
      inversePatches: this.inversePatches,
    })

    // reset local state
    this.patches = []
    this.inversePatches = []
  }

  /**
   * Applys inverse patches from a specific transaction, mutating the target state
   * @param txId transaction id
   */
  public rollbackTransaction = async (txId: string) => {
    const tx = await this.store.getTransaction(txId)
    this.untracked(() => {
      applyPatch(this.targetState, tx.inversePatches)
    })
    await this.uncommitTransaction(tx)
  }

  /**
   * Replays all patches on the targetState from txId
   * @param txId transaction id
   */
  public async resumeFromTxId (txId: string) {
    const allTxs = await this.store.getTransactions(txId)
    // @TODO(shrugs) - do we need to untrack this?
    this.untracked(() => {
      allTxs.forEach((tx) => {
        applyPatch(this.targetState, tx.patches)
      })
    })
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

  private untracked = (fn) => {
    this.skipping = true
    fn()
    this.skipping  = false
  }

  private handlePatch = (patch: IJsonPatch, inversePatch: IJsonPatch) => {
    if (this.skipping) {
      return
    }

    // we have access to reason and meta here, thanks to the global
    // so we need to log that in the database to track why patches were made
    // // do we need to replace the json blob with a linked array of
    // patches? how do we link the artifact with the event log?
    // console.log(globalState.currentReason)

    const patchId = uuid.v4()
    const pathParts = splitPath(patch.path)
    // parse storeKey and keyKey from path and provide to patch
    this.patches.push({
      ...patch,
      id: patchId,
      ...pathParts,
    })
    this.inversePatches.push({
      ...inversePatch,
      id: patchId,
      ...pathParts,
    })
  }
}

export default Ourbit
