import makeDebug = require('debug')

import assert = require('assert')
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
      this.reducer.config.key,
      this.ourbit.processTransaction,
      this.ourbit.rollbackTransaction,
      this.handleNewBlock,
      BLOCK_RETENTION,
    )
  }

  public run = async (fromBlockHash: string | null) => {
    await globalState.store.saveReducer(this.reducer.config.key)
    let latestBlockHash = fromBlockHash

    switch (this.reducer.config.type) {
      // idempotent reducers are only called from HEAD
      case ReducerType.Idempotent:
        latestBlockHash = null
        break
      // TimeVarying and Atomic Reducers start from a provided block hash, the latest in the DB, or HEAD
      case ReducerType.TimeVarying:
      case ReducerType.Atomic: {
        if (this.shouldResume) {
          // we're resuming, so replay from store if possible
          try {
            const latestTransaction = await globalState.store.getLatestTransaction(this.reducer.config.key)

            // load historical chain
            const historicalBlocks = await globalState.store.getHistoricalBlocks(this.reducer.config.key)

            if (!latestTransaction || !historicalBlocks || historicalBlocks.length === 0) {
              throw new Error('No latest transaction or historical blocks available, skipping resumption.')
            }

            try {
              const mostRecentHistoricalBlock = historicalBlocks[historicalBlocks.length - 1]

              assert.equal(
                mostRecentHistoricalBlock.hash,
                latestTransaction.blockHash,
                `We have a latestTransaction ${latestTransaction.id} with blockHash ${latestTransaction.blockHash}
                but it doesn't match the most recent historical block ${mostRecentHistoricalBlock.hash}!`,
              )

              // let's re-hydrate local state by replaying transactions
              this.debug('Attempting to reload ourbit state from %s', latestTransaction.id || 'HEAD')
              await this.ourbit.resumeFromTxId(latestTransaction.id)
              this.debug('Done reloading ourbit state.')

              this.debug('Attempting to reload blockstream state from %s', latestTransaction.blockHash)
              // let's reset the blockstreamer's internal state
              await this.blockstreamer.initWithHistoricalBlocks(historicalBlocks)
              this.debug('Done reloading blockstream state.')

              latestBlockHash = latestTransaction.blockHash
            } catch (error) {
              // we weren't able to replace state, which means something is totally broken
              this.debug(error)
              process.exit(1)
            }
          } catch (error) {
            // there's nothing to replay, so let's start from fromBlockHash HEAD
            this.debug(error.message)
          }
        } else {
          // we specifically reset, so let's start from HEAD
          this.debug('Explicitely starting from %s', latestBlockHash || 'HEAD')
        }
        break
      }
      default:
        throw new Error(`Unexpected ReducerType ${this.reducer.config.type}`)
    }

    this.debug('Streaming blocks from %s', latestBlockHash || 'HEAD')

    // if we are not resuming, reset blockstreamer chain
    if (!this.shouldResume) {
      await globalState.store.deleteHistoricalBlocks(this.reducer.config.key)
    }

    // and now ingest blocks from latestBlockHash
    await this.blockstreamer.start(latestBlockHash)

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

    await this.reducer.reduce(this.reducer.state, block, this.context.utils)
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
