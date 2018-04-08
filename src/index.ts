import { IStateTreeNode, types } from 'mobx-state-tree'
import Blockstream from './Blockstream'
import Ourbit, {
  IPatch,
  IPersistInterface,
  ITransaction,
  ITypeStore,
} from './Ourbit'
import persistStateWithStore from './persistStateWithStore'

export {
  IPersistInterface,
  ITransaction,
  ITypeStore,
}

export const because = (reason, meta, fn) => {
  // start group with reason + meta
  // how does this interact with Ourbit? we'll be in the context of processTransaction here

  fn()
}

class Gnarly {

  public ourbit: Ourbit
  public blockstreamer: Blockstream

  private stopPersistingStateWithStore

  constructor (
    private stateReference: IStateTreeNode,
    private storeInterface: IPersistInterface,
    private nodeEndpoint: string,
    private typeStore: ITypeStore,
    private onBlock: (block: any) => void,
  ) {
    this.ourbit = new Ourbit(this.stateReference, this.storeInterface)
    this.blockstreamer = new Blockstream(this.nodeEndpoint, this.ourbit, this.onBlock)
  }

  public shaka () {
    this.blockstreamer.start()
    this.stopPersistingStateWithStore = persistStateWithStore(this.ourbit, this.typeStore)
    return this.bailOut.bind(this)
  }

  public async bailOut () {
    await this.stopPersistingStateWithStore()
    await this.blockstreamer.stop()
  }
}

export default Gnarly
