
import { types } from 'mobx-state-tree'
import Sequelize from 'sequelize'
import Gnarly, {
  because,
  IPatch,
} from '../../src'
import {
  SequelizePersistInterface,
} from '../../src/stores'

const connectionString = 'postgres://'
const sequelize = new Sequelize(connectionString)

const Kitty = sequelize.define('kitty', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
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
  return () => {
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
}

const gnarly = new Gnarly(
  stateReference,
  storeInterface,
  nodeEndpoint,
  MyTypeStore,
  onBlock,
)

gnarly.shaka()
