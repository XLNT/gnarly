import { transaction } from 'mobx'
import {
  getSnapshot,
  IJsonPatch,
  onPatch,
  onSnapshot,
  types,
} from 'mobx-state-tree'

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

interface IPersistInterface {
  deletePatchesWithTransactionId: (txId: string) => Promise<any>
  persistPatch: (txId: string, patch: IJsonPatch) => Promise<any>
  patchesFrom: (txId: string) => Promise<any>
}

class Ourbit {
  public targetStore
  public persistStore: IPersistInterface
  constructor (targetStore, persistStore: IPersistInterface) {
    this.targetStore = targetStore
    this.persistStore = persistStore

    onPatch(this.targetStore, (patch: IJsonPatch, reversPatch: IJsonPatch) => {
      console.log('THIS')

    })
  }
}
