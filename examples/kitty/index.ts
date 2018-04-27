/**
 *
 * Run me with:
 * LATEST_BLOCK_HASH=0x79c943cb77f647e0553a101d0c1df2d05645782b3a1ac8d3cabc593eb4fc3fa3 \
 *   ts-node ./examples/kitty/index.ts
 */

import { types } from 'mobx-state-tree'
import * as Sequelize from 'sequelize'
import Gnarly, {
  addABI,
  because,
  Block,
} from '../../dist'

// NOTE: this needs to be a parity archive+tracing node
// personally, I have one of these in AWS and port-forward my local 8545 to that
const nodeEndpoint = 'http://localhost:8545'
// a local postgres database
const connectionString = 'postgres://postgres@localhost/default'
const sequelize = new Sequelize(connectionString)

const CRYPTO_KITTIES = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'

addABI(CRYPTO_KITTIES, [{
  anonymous: false,
  inputs: [
    { indexed: false, name: 'from', type: 'address' },
    { indexed: false, name: 'to', type: 'address' },
    { indexed: false, name: 'tokenId', type: 'uint256' },
  ],
  name: 'Transfer',
  type: 'event',
}],
)

const Counter = sequelize.define('counter', {
  id: { type: Sequelize.STRING, primaryKey: true },
  value: { type: Sequelize.INTEGER },
})

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
      { fields: ['txId'] },
    ],
  })

const MyTypeStore = {
  counterTracker: {
    counter: async (txId: string, patch: any) => {
      switch (patch.op) {
        case 'add': {
          await Counter.create({
            id: patch.key,
            value: patch.value,
          })
          break
        }
        case 'replace': {
          await Counter.update({
            id: patch.key,
            value: patch.value,
          }, {
              where: { id: patch.key },
            })
          break
        }
        case 'remove': {
          await Counter.destroy({
            where: { id: patch.key },
          })
          break
        }
        default: {
          throw new Error('wut')
        }
      }
    },
  },
  kittyTracker: {
    ownerOf: async (txId: string, patch: any) => {
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
            },
          )
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

const reasons = {
  TransactionExists: 'TRANSACTION_EXISTS',
  KittyTransfer: 'KITTY_TRANSFER',
}

const CounterTracker = types
  .model('CounterTracker', {
    counter: types.optional(types.map(types.number), {}),
  })
  .actions((self) => ({
    increment (key: string, amount: number = 1) {
      self.counter.set(
        key,
        self.counter.has(key)
          ? self.counter.get(key) + amount
          : amount,
      )
    },
  }))

const KittyTracker = types
  .model('KittyTracker', {
    ownerOf: types.optional(types.map(types.string), {}),
  })
  .actions((self) => ({
    setOwner (tokenId, to) {
      self.ownerOf.set(tokenId, to)
    },
  }))

const Store = types.model('Store', {
  counterTracker: types.optional(CounterTracker, {}),
  kittyTracker: types.optional(KittyTracker, {}),
})

const stateReference = Store.create({
  counterTracker: CounterTracker.create(),
  kittyTracker: KittyTracker.create(),
})

const storeInterface = new SequelizePersistInterface(connectionString)

const onBlock = async (block) => {
  console.log(`[gnarly] processing block ${block.number} (${block.hash}) with ${block.transactions.length} txs`)

  because(reasons.TransactionExists, {}, () => {
    stateReference.counterTracker.increment('txs', block.transactions.length)
  })

  forEach(block.transactions, async (tx) => {
    if (addressesEqual(tx.to, CRYPTO_KITTIES)) {
      await tx.getReceipt()

      tx.logs.forEach((log) => {
        if (log.event === 'Transfer') {
          const { to, tokenId } = log.args
          because(reasons.KittyTransfer, {}, () => {
            stateReference.kittyTracker.setOwner(tokenId, to)
          })

        }
      })
    }
  })
}

const gnarly = new Gnarly(
  stateReference,
  storeInterface,
  nodeEndpoint,
  MyTypeStore,
  onBlock,
)

const main = async () => {
  await storeInterface.setup()
  await Counter.sync({ force: true })
  await Kitty.sync({ force: true })
  await gnarly.shaka()
}

process.on('unhandledRejection', (error) => {
  console.error(error)
  process.exit(1)
})

process.on('SIGINT', () => {
  gnarly.bailOut()
  process.exit(0)
})

main()
  .catch((error) => {
    console.error(error, error.stack)
    process.exit(1)
  })
