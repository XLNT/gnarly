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

/**
 *
 * blockchain-part:
 * stateReference = types.model("Store")...
 *
 * storeInterface = {
 *   persistPatch,
 *   patchesFrom(tx_id),
 * }
 *
 * typeStoreInterface: {
 *   kittyTracker: {
 *     ownerOf: (tx_id, { op, key, value }) => {
 *       switch (op) {
 *         add/replace:
 *           UPSERT WHERE kitty_id = key SET owner_id = value, tx_id = tx_id
 *         remove:
 *           DELETE FROM WHERE kitty_id = key, tx_id = tx_id
 *       }
 *     }
 *   }
 * }
 *
 *
 *
 * gnarly.persistStateWithStore(stateReference, typeStoreInterface)
 *
 * stateReference.onPatch((patch) => {
 *   // patch.path = /storeKey/keyKey/key
 *   // storeKey = kittyTracker
 *   // keyKey = ownerOf
 *   // key = key
 *
 *   typeStoreInterface[storeKey][keyKey](tx_id, patch)
 * })
 *
 */

// import {
//   BlockchainPart,
//   persistStateWithStore,
// } from './'

import { types } from 'mobx-state-tree'

import Ourbit, {
  IPatch,
  IPersistInterface,
  ITransaction,
  ITypeStore,
} from './Ourbit'

import Sequelize from 'sequelize'

const persistStateWithStore = async (ourbit, typeStore) => {
  ourbit.on('patch:persist', (txId: string, patch: IPatch) => {
    typeStore[patch.reducerKey][patch.domainKey](txId, patch)
  })
}

class SequelizePersistInterface implements IPersistInterface {
  private connectionString
  private sequelize

  private Transaction

  constructor (connectionString: string) {
    this.connectionString = connectionString
    this.sequelize = new Sequelize(this.connectionString)

    this.Transaction = this.sequelize.define('transaction', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      patches: Sequelize.JSON,
      inversePatches: Sequelize.JSON,
    })
  }

  public async getTransactions (fromTxId: null | string) {
    return this.Transaction.findAll()
  }

  public async deleteTransaction (tx: ITransaction) {
    return this.Transaction.destroy({
      where: { id: tx.id },
    })
  }

  public async saveTransaction (tx: ITransaction) {
    return this.Transaction.create(tx)
  }

  public async getTransaction (txId: string) {
    return this.Transaction.findById(txId)
  }
}

const anotherConnectionString = 'postgres://'
const sequelize = new Sequelize(anotherConnectionString)

const Kitty = this.sequelize.define('kitty', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
  txId: { type: Sequelize.STRING },
  patchId: { type: Sequelize.STRING },

  kittyId: { type: Sequelize.STRING },
  owner: { type: Sequelize.STRING },
}, {
  indexes: [
    { fields: ['kittyId'] },
    { fields: ['owner'] },
    { fields: ['txId'], unique: true },
  ],
})

const MyTypeStore = {
  kittyTracker: {
    ownerOf: async (txId: string, patch: IPatch) => {
      switch (patch.op) {
        case 'add': {
          await Kitty.create({
            txId,
            patchId: patch.id,
            kittyId: patch.key,
            owner: patch.value,
          })
          break
        }
        case 'replace': {
          await Kitty.update({
            txId,
            patchId: patch.id,
            kittyId: patch.key,
            owner: patch.value,
          }, {
            where: { kittyId: patch.key },
          })
          break
        }
        case 'remove': {
          await Kitty.destroy({
            where: { kittyId: patch.key },
          })
          break
        }
        default: {
          throw new Error('wut')
        }
      }
    },
  },
}

export const because = (reason, meta, fn) => {
  // start group with reason + meta
  // how does this interact with Ourbit? we'll be in the context of processTransaction here

  fn()
}

// developer land
const CRYPTO_KITTIES = '0x0'

const reasons = {
  BlockProduced: 'BLOCK_PRODUCED',
  KittyTransfer: 'KITTY_TRANSFER',
  DonationCreated: 'DONATION_CREATED',
}

const KittyTracker = types
  .model('KittyTracker', {
    ownerOf: types.optional(types.map(types.string), {}),
  })
  .actions((self) => ({
    transfer (tokenId, to) {
      self.ownerOf.set(tokenId, to)
    },
  }))

const Store = types.model('Store', {
  kittyTracker: types.optional(KittyTracker, {}),
})

const stateReference = Store.create({
  kittyTracker: KittyTracker.create(),
})

const storeInterface = new SequelizePersistInterface('postgres://')
const nodeEndpoint = ''

const onBlock = (block) => {
  block.transactions.forEach((tx) => {
    if (tx.to === CRYPTO_KITTIES) {
      tx.events.forEach((event) => {
        if (event.name === 'Transfer') {

          because(reasons.KittyTransfer, {}, () => {
            stateReference.kittyTracker.transfer(event[0], event[1])
          })
        }
      })
    }
  })
}

const ourbit = new Ourbit(stateReference, storeInterface)
const blockstreamer = new BlockchainPart(nodeEndpoint, ourbit, onBlock)

persistStateWithStore(ourbit, MyTypeStore)

const gnarly = new Gnarly({
  stateReference,
  storeInterface,
  nodeEndpoint,
  typeStore: MyTypeStore,
  onBlock,
})

gnarly.shaka()

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
