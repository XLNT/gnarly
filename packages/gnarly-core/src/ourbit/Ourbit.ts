import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:ourbit')
const debugNotifyPatches = makeDebug('gnarly-core:ourbit:notifyPatches')

import {
  applyPatch,
  generate,
  observe,
  unobserve,
} from '@xlnt/fast-json-patch'
import uuid = require('uuid')

import { globalState } from '../globalstate'
import { ReducerContext } from '../reducer'
import { invertPatch, operationsOfPatches, toOperation } from '../utils'
import {
  IOperation,
  IPatch,
  ITransaction,
  ITxExtra,
  PersistPatchHandler,
} from './types'

/*
 * Ourbit
 *
 * > because I couldn't think of a better name than `urbit` and this is our's
 *
 * a transaction is a discrete set of events that produce patches to the state
 *   but should be treated as a single atomic unit that can be reverted.
 *
 * when using gnarly with blockchains, the tx.id is the block hash
 * because it happens to be globally unique
 * (but this should not be relied on)
 *
 * ourbit's responsibilities:
 *    - ourbit = new Ourbit(targetState, store, persistPatch)
 *    - ourbit.resumeFromTxId(txId = null)
 *    - ourbit.processTransaction(txId, operation producer)
 *    - ourbit.rollbackTransaction(txId)
 */
class Ourbit {
  constructor (
    private key: string,
    private targetState: object,
    private persistPatch: PersistPatchHandler,
    private context: ReducerContext,
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
        reason: this.context.getCurrentReason(),
      })
    })

    // allow reducer to force-collect patches for order-dependent operations
    this.context.setPatchGenerator(() => {
      generate(observer)
    })

    // collect any operations that are directly emitted
    this.context.setOpCollector((op: IOperation) => {
      patches.push({
        id: uuid.v4(),
        operations: [op],
        reason: this.context.getCurrentReason(),
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
    const tx = await globalState.store.getTransaction(this.key, txId)
    await this.uncommitTransaction(tx)
  }

  /**
   * Replays all patches on the targetState from txId
   * @param txId transaction id
   */
  public async resumeFromTxId (txId: string) {
    debug('Resuming from txId %s', txId)
    const allTxs = await globalState.store.getAllTransactionsTo(this.key, txId)
    let totalPatches = 0
    for await (const batch of allTxs) {
      const txBatch = batch as ITransaction[]
      txBatch.forEach((tx) => {
        totalPatches += tx.patches.length
        debug('[applyPatch] %s %d', tx.id, tx.patches.length)
        const allOperations = operationsOfPatches(tx.patches)
        applyPatch(this.targetState, allOperations.map(toOperation))
      })
    }
    debug('finished applying %d patches', totalPatches)
  }

  private notifyPatches = async (txId: string, patches: IPatch[]) => {
    debugNotifyPatches('notifyPatches: %s, %j', txId, patches)
    for (const patch of patches) {
      await this.persistPatch(txId, patch)
    }
  }

  private commitTransaction = async (tx: ITransaction) => {
    // save transaction
    await globalState.store.saveTransaction(this.key, tx)
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

    const mutableOperations = inverseOperations.filter((op) => !op.volatile)
    // apply mutable changes locally
    applyPatch(this.targetState, mutableOperations.map(toOperation))
    // apply to store (mutable and volatile)
    await this.notifyPatches(tx.id, inversePatches)
    // delete transaction
    await globalState.store.deleteTransaction(this.key, tx)
  }
}

export default Ourbit
