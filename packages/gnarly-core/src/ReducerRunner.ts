import makeDebug = require('debug')

import Blockstream from './Blockstream'
import { globalState } from './globalstate'
import Block, { IJSONBlock } from './models/Block'
import Ourbit, {
  IOperation,
  IPatch,
} from './ourbit'
import { IReducer, ReducerContext, ReducerType } from './reducer'
import {
  SetdownFn,
  SetupFn,
  TypeStorer,
} from './typeStore'

// TODO: should be moved to bin
const BLOCK_RETENTION = 100

export class ReducerRunner {
  public ourbit: Ourbit
  public blockstreamer: Blockstream
  public shouldResume: boolean = true

  private debug
  private context: ReducerContext

  constructor (
    private reducer: IReducer,
  ) {
    this.debug = makeDebug(`gnarly-core:runner:${this.reducer.config.key}`)
    this.context = new ReducerContext(this.reducer.config.key)

    this.ourbit = new Ourbit(
      this.reducer.config.key,
      this.reducer.state,
      this.persistPatchHandler,
      this.context,
    )

    this.blockstreamer = new Blockstream(
      this.ourbit,
      BLOCK_RETENTION,
      this.handleNewBlock,
      this.handleInvalidBlock,
    )
  }

  public run = async (fromBlockHash: string = null) => {
    await globalState.store.saveReducer(this.reducer.config.key)
    let latestBlockHash = fromBlockHash
    let historicalBlocks = []

    switch (this.reducer.config.type) {
      // idempotent reducers are only called from HEAD
      case ReducerType.Idempotent:
        latestBlockHash = null
        historicalBlocks = []
        break
      // TimeVarying and Atomic Reducers start from a provided block hash, the latest in the DB, or HEAD
      case ReducerType.TimeVarying:
      case ReducerType.Atomic: {
        if (this.shouldResume) {
          // we're resuming, so replay from store if possible
          try {
            const latestTransaction = await globalState.store.getLatestTransaction(this.reducer.config.key)
            if (!latestTransaction) {
              throw new Error('No latest transaction available.')
            }

            // we're resuming, so reload blockstreamer chain
            historicalBlocks = await globalState.store.getHistoricalBlocks(this.reducer.config.key)

            // if no history is available, resume from blockHash
            if (!historicalBlocks.length) {
              latestBlockHash = latestTransaction.blockHash
            }

            try {
              // let's re-hydrate local state by replaying transactions
              this.debug('Attempting to reload state from %s', latestTransaction.id || 'HEAD')
              await this.ourbit.resumeFromTxId(latestTransaction.id)
            } catch (error) {
              // we weren't able to replace state, which means something is totally broken
              this.debug(error)
              process.exit(1)
            }
          } catch (error) {
            latestBlockHash = null
            historicalBlocks = []
            this.debug('No latest transaction, so we\'re definitely starting from scratch.')
          }
        } else {
          // we reset, so let's start from HEAD
          this.debug('Explicitely starting from %s', latestBlockHash || 'HEAD')
        }
        break
      }
      default:
        throw new Error(`Unexpected ReducerType ${this.reducer.config.type}`)
    }

    this.debug('Streaming blocks from %s', latestBlockHash || 'HEAD')

    // if we are not resuming, reset blockstreamer chain
    if (!historicalBlocks.length) {
      await globalState.store.deleteHistoricalBlocks(this.reducer.config.key)
    }

    // and now ingest blocks from latestBlockHash
    await this.blockstreamer.start(latestBlockHash, historicalBlocks)

    return this.stop.bind(this)
  }

  public stop = async () => {
    await this.blockstreamer.stop()
  }

  public reset = async (shouldReset: boolean = true) => {
    this.shouldResume = !shouldReset

    if (shouldReset) {
      const setdown = this.reducer.config.typeStore.__setdown as SetdownFn
      await setdown()
    }

    const setup = this.reducer.config.typeStore.__setup as SetupFn
    await setup()
  }

  private handleNewBlock = (rawBlock: IJSONBlock, syncing: boolean) => async () => {
    const block = await this.normalizeBlock(rawBlock)

    await globalState.store.saveHistoricalBlock(this.reducer.config.key, BLOCK_RETENTION, {
      hash: block.hash,
      number: rawBlock.number,
      parentHash: block.parentHash,
    })

    await this.reducer.reduce(this.reducer.state, block, this.context.utils)
  }

  private handleInvalidBlock = (rawBlock: IJSONBlock, syncing: boolean) => async () => {
    const block = await this.normalizeBlock(rawBlock)

    await globalState.store.deleteHistoricalBlock(this.reducer.config.key, block.hash)
  }

  private normalizeBlock = async (block: IJSONBlock): Promise<Block> => {
    return new Block(block)
  }

  private persistPatchHandler = async (txId: string, patch: IPatch) => {
    for (const op of patch.operations) {
      await this.persistOperation(patch.id, op)
    }
  }

  private persistOperation = async (patchId: string, operation: IOperation) => {
    const storer = this.reducer.config.typeStore.store as TypeStorer
    await storer(patchId, operation)
  }
}

export const makeRunner = (
    reducer: IReducer,
  ) => new ReducerRunner(
    reducer,
  )

export default ReducerRunner
