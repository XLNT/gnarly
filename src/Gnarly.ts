import { IStateTreeNode } from 'mobx-state-tree'
import Blockstream from './Blockstream'
import Ourbit, {
  IPatch,
  IPersistInterface,
  ITypeStore,
} from './Ourbit'

import Block, { IJSONBlock } from './models/Block'
import NodeApi from './models/NodeApi'
import { IReducer, ReducerType } from './reducer'

import { globalState } from './globalstate'

export type OnBlockHandler = (block: Block) => () => Promise<void>

class Gnarly {
  public ourbit: Ourbit
  public blockstreamer: Blockstream

  constructor (
    private stateReference: IStateTreeNode,
    private storeInterface: IPersistInterface,
    private nodeEndpoint: string,
    private typeStore: ITypeStore,
    private reducers: IReducer[],
  ) {
    globalState.setApi(new NodeApi(nodeEndpoint))

    this.ourbit = new Ourbit(
      this.stateReference,
      this.storeInterface,
      this.persistPatchHandler,
    )

    this.blockstreamer = new Blockstream(
      this.ourbit,
      this.handleNewBlock,
    )
  }

  public shaka = async () => {
    let latestBlockHash
    if (process.env.LATEST_BLOCK_HASH) {
      latestBlockHash = process.env.LATEST_BLOCK_HASH
    } else {
      const latestTransaction = await this.storeInterface.getLatestTransaction()
      latestBlockHash = latestTransaction ? latestTransaction.id : null
      // ^ latest transaction id happens to also be the latest block hash
      // so update this line if that ever becomes not-true
    }

    await this.blockstreamer.start(latestBlockHash)
    return this.bailOut.bind(this)
  }

  public bailOut = async () => {
    await this.blockstreamer.stop()
  }

  private handleNewBlock = (rawBlock: IJSONBlock, syncing: boolean) => async () => {
    const block = await this.normalizeBlock(rawBlock)

    for (const reducer of this.reducers) {
      switch (reducer.config.type) {
        case ReducerType.Idempotent:
          if (!syncing) {
            // only call Idempotent reducers if not syncing
            await reducer.reduce(this.stateReference[reducer.config.key], block)
          }
          break
        case ReducerType.TimeVarying:
        case ReducerType.Atomic:
          await reducer.reduce(this.stateReference[reducer.config.key], block)
          break
        default:
          throw new Error(`Unexpected ReducerType ${reducer.config.type}`)
      }
    }
  }

  private normalizeBlock = async (block: IJSONBlock): Promise<Block> => {
    return new Block(block)
  }

  private persistPatchHandler = async (txId: string, patch: IPatch) => {
    await this.typeStore[patch.reducerKey][patch.domainKey](txId, patch)
  }
}

export default Gnarly
