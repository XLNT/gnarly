import { transaction } from 'mobx'
import {
  getSnapshot,
  IJsonPatch,
  onPatch,
  onSnapshot,
  types,
} from 'mobx-state-tree'

import { EventEmitter } from 'events'
import uuidv4 from 'uuid/v4'

/*
 * urbit:
 * a transaction is a discrete set of events that produce patches to the state
 *   but should be treated as a single unit that can be reverted.
 *   One transaction can produce multiple events that can produce multiple patches.
 * tx => [event]
 * event => [patch]
 * tx_id = uuid for each transaction(), by which patches are indexed
 *
 * when using gnarly with blockchains, tx_id === block_id (fork_id, block_num)
 *
 *  - handle resuming itself from either null, or some tx_id
 *    - pulling patches from that tx_id and apply them over provided initialState
 *    - urbit = new Urbit(stateReference, storeInterface)
 *    - urbit.applyPatchesFrom(tx_id = null)
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

export interface IPatch extends IJsonPatch, IPathThing {
  id: string
}

// tslint:disable-next-line no-empty-interface
export interface ITypeStore {

}

export interface IPersistInterface {
  getTransactions: (fromTxId: null|string) => Promise<ITransaction[]>
  // @TODO ^ make this a generator that batches transaction returns

  deleteTransaction: (tx: ITransaction) => Promise<any>
  saveTransaction: (tx: ITransaction) => Promise<any>
  getTransaction: (txId: string) => Promise<ITransaction>

  // event log CRUD actions
}

class Ourbit extends EventEmitter {
  public targetState
  public store: IPersistInterface

  private skipping: boolean = false

  private patches = []
  private inversePatches = []

  constructor (targetState, store: IPersistInterface) {
    super()

    this.targetState = targetState
    this.store = store

    onPatch(this.targetState, this.handlePatch)
  }

  /**
   * Tracks and perists patches (created by fn) by txId
   * @param txId transaction id
   * @param fn mutating function
   */
  public async processTransaction (txId: string, fn) {
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
  public async rollbackTransaction (txId: string) {
    const tx = await this.store.getTransaction(txId)
    this.untracked(() => {
      this.targetState.applyPatch(tx.inversePatches)
    })
    this.uncommitTransaction(tx)
  }

  /**
   * Replays all patches on the targetState from txId
   * @param txId transaction id
   */
  public async resumeFromTxId (txId: string) {
    const allTxs = await this.store.getTransactions(txId)
    this.untracked(() => {
      allTxs.forEach((tx) => {
        this.targetState.applyPatch(tx.patches)
      })
    })
  }

  private async persistPatches (txId: string, patches: IPatch[]) {
    patches.forEach((patch) => {
      this.emit('patch:persist', txId, patch)
    })
  }

  private async commitTransaction (tx: ITransaction) {
    await this.store.saveTransaction(tx)
    await this.persistPatches(tx.id, tx.patches)
  }

  private async uncommitTransaction (tx: ITransaction) {
    await this.store.deleteTransaction(tx)
    await this.persistPatches(tx.id, tx.inversePatches)
  }

  private untracked (fn) {
    this.skipping = true
    fn()
    this.skipping  = false
  }

  private handlePatch (patch: IJsonPatch, inversePatch: IJsonPatch) {
    if (this.skipping) {
      return
    }

    const patchId = uuidv4()
    const pathParts = this.splitPath(patch.path)
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

  private splitPath (path: string): IPathThing {
    const [reducerKey, domainKey, key] = path.split('/')
    return { reducerKey, domainKey, key }
  }
}

export default Ourbit
