import { IStateTreeNode } from 'mobx-state-tree'
import Blockstream from './Blockstream'
import Ourbit, {
  IPatch,
  IPersistInterface,
  ITypeStore,
} from './Ourbit'

import Block, { IJSONBlock } from './models/Block'
import NodeApi from './models/NodeApi'

export const because = (reason, meta, fn) => {
  // start group with reason + meta
  // how does this interact with Ourbit? we'll be in the context of processTransaction here
  fn()
}

export type OnBlockHandler = (block: Block) => () => Promise<void>
export type TransactionProducer = (block: Block) => Promise<void>

class Gnarly {
  public ourbit: Ourbit
  public blockstreamer: Blockstream

  private api: NodeApi

  constructor (
    private stateReference: IStateTreeNode,
    private storeInterface: IPersistInterface,
    private nodeEndpoint: string,
    private typeStore: ITypeStore,
    private onBlock: TransactionProducer,
  ) {
    this.ourbit = new Ourbit(
      this.stateReference,
      this.storeInterface,
      this.persistPatchHandler,
    )
    this.api = new NodeApi(nodeEndpoint)
    this.blockstreamer = new Blockstream(
      this.api,
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
      // ^ latestBlockHash happens to also be the latest block hash
    }

    await this.blockstreamer.start(latestBlockHash)
    return this.bailOut.bind(this)
  }

  public bailOut = async () => {
    await this.blockstreamer.stop()
  }

  private handleNewBlock = (block: IJSONBlock) => async () => {
    const gnarlyBlock = await this.normalizeBlock(block)
    await this.onBlock(gnarlyBlock)
  }

  private normalizeBlock = async (block: IJSONBlock): Promise<Block> => {
    return new Block(block, this.api)
  }

  private persistPatchHandler = async (txId: string, patch: IPatch) => {
    await this.typeStore[patch.reducerKey][patch.domainKey](txId, patch)
  }
}

export default Gnarly
