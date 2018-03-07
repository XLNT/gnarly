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
  IPatch,
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

// replace for loop with onBlockProduced
// for (let i = 1; i < 11; i++) {
//   const block = { number: i  }

//   because(reasons.BlockProduced, { number: block.number }, () => {
//     store.gasPrice.addGasPriceAverage(1000 * block.number)
//   })

//   because(reasons.KittyTransfer, { id: '0xkitty', from: '0x1', to: '0x2' }, () => {
//     store.kitties.transfer('0xkitty', '0x2')
//   })

//   because(reasons.DonationCreated, { from: '0x1', amount: 45 }, () => {
//     store.donations.addDonation('0x1', 45)
//     store.donations.addDonation('0x1', 65)
//   })
// }
