import { IStateTreeNode, types } from 'mobx-state-tree'
import Blockstream from './Blockstream'
import Ourbit, {
  IPatch,
  IPersistInterface,
  ITransaction,
  ITypeStore,
} from './Ourbit'

export {
  IPatch,
  IPersistInterface,
  ITransaction,
  ITypeStore,
}

export * from './stores'

export const because = (reason, meta, fn) => {
  // start group with reason + meta
  // how does this interact with Ourbit? we'll be in the context of processTransaction here

  fn()
}

class Gnarly {

  public ourbit: Ourbit
  public blockstreamer: Blockstream

  constructor (
    private stateReference: IStateTreeNode,
    private storeInterface: IPersistInterface,
    private nodeEndpoint: string,
    private typeStore: ITypeStore,
    private onBlock: (block: any) => void,
  ) {
    this.ourbit = new Ourbit(
      this.stateReference,
      this.storeInterface,
      this.persistPatchHandler,
    )
    this.blockstreamer = new Blockstream(this.nodeEndpoint, this.ourbit, this.onBlock)
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

  private persistPatchHandler = async (txId: string, patch: IPatch) => {
    await this.typeStore[patch.reducerKey][patch.domainKey](txId, patch)
  }
}

export default Gnarly
