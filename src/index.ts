// import 'isomorphic-fetch'

// import {
//     action,
//     autorun,
//     computed,
//     observable,
//     transaction,
//     useStrict,
// } from 'mobx'
// useStrict(true)

// import AppState from './AppState'
// import Blockstream from './Blockstream'

// const state = new AppState()

// autorun(() => {
//   console.log(state.numTransactions, state.weight.toString())
// })

// const web3Endpoint = 'http://localhost:8545'

// const blockstream = Blockstream(web3Endpoint)

// blockstream.on('block:add', (blockData) => {
//   state.handleNewBlockData(blockData)
// })

// blockstream.on('block:remove', (blockData) => {
//   state.invalidateBlockData(blockData)
// })

// setTimeout(() => {
//   blockstream.close()
// }, 60000)

/*

we need to store a list of patches to the declared state
and start from nothing, apply all patches and arrive at the correct steady state
in our system, each entry is linked to an action that produced it

*/

import { transaction } from 'mobx'
import { getSnapshot, onPatch, onSnapshot, types } from 'mobx-state-tree'
import Urbitesq from './Urbitesq'

class RedisMock {
  private store = {}

  public async set (key, value) {
    this.store[key] = value
  }

  public async get (key) {
    return this.store[key]
  }
}

const GasPriceOracle = types
  .model('GasPriceOracle', {
    blockGasPriceAverages: types.optional(types.array(types.number), []),
  })
  .actions((self) => ({
    addGasPriceAverage (avg) {
      self.blockGasPriceAverages.push(avg)
    },
  }))
  .views((self) => ({
    get gasPrice () {
      return self.blockGasPriceAverages.reduce((memo, bgpa) => memo + bgpa, 0) / self.blockGasPriceAverages.length
    },
  }))

const KittyTracker = types
  .model('KittyTracker', {
    ownerOf: types.optional(types.map(types.string), {}),
  })
  .actions((self) => ({
    transfer (tokenId, to) {
      self.ownerOf.set(tokenId, to)
    },
  }))
  // .views((self) => ({
  //   ownerOf (tokenId) {
  //     return self.ownerOf[tokenId]
  //   },
  // }))

const kittyTracker = KittyTracker.create({
  ownerOf: {
    '0xkitty': '0x1',
  },
})

const DonationTracker = types
  .model('DonationTracker', {
    donations: types.optional(types.map(types.number), {}),
  })
  .actions((self) => ({
    addDonation (from, amount) {
      self.donations.set(from, (self.donations[from] || 0) + amount)
    },
  }))

const donationTracker = DonationTracker.create({
  donations: {},
})

const Store = types.model('Store', {
  gasPrice: types.optional(GasPriceOracle, {}),
  kitties: types.optional(KittyTracker, {}),
  donations: types.optional(DonationTracker, {}),
})

// @TOOD - how to root store?????
const store = Store.create({
  gasPrice: GasPriceOracle.create({
    blockGasPriceAverages: [1, 12, 3],
  }),
  kitties: kittyTracker,
  donations: donationTracker,
})

onPatch(store, (patch) => {
  console.dir(patch)
})

const reasons = {
  BlockProduced: 'BLOCK_PRODUCED',
  KittyTransfer: 'KITTY_TRANSFER',
  DonationCreated: 'DONATION_CREATED',
}

const because = (reason, meta, fn) => {
  // start group with reason + meta
  transaction(() => {
    fn()
  })
}

// replace for loop with onBlockProduced
for (let i = 1; i < 11; i++) {
  const block = { number: i  }

  because(reasons.BlockProduced, { number: block.number }, () => {
    store.gasPrice.addGasPriceAverage(1000 * block.number)
  })

  because(reasons.KittyTransfer, { id: '0xkitty', from: '0x1', to: '0x2' }, () => {
    store.kitties.transfer('0xkitty', '0x2')
  })

  because(reasons.DonationCreated, { from: '0x1', amount: 45 }, () => {
    store.donations.addDonation('0x1', 45)
    store.donations.addDonation('0x1', 65)
  })
}
