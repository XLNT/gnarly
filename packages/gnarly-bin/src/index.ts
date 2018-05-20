
/**
 * @TODO - handle lazy-require, config-based bootstrapping
 */
import Sequelize = require('sequelize')

import Gnarly, {
  addABI,
  addressesEqual,
  because,
  Block,
  forEach,
  makeRootTypeStore,
  makeStateReference,
  SequelizePersistInterface,
} from '@xlnt/gnarly-core'

import makeERC721Reducer, {
  makeSequelizeTypeStore as makeERC721TypeStore,
} from '@xlnt/gnarly-reducer-erc721'

import makeBlockReducer, {
  makeSequelizeTypeStore as makeBlockTypeStore,
} from '@xlnt/gnarly-reducer-block-meta'

const main = async () => {
  if (process.env.NODE_ENV !== 'production') {
    (await import('dotenv')).config()
  }

  const nodeEndpoint = process.env.NODE_ENDPOINT
  const connectionString = process.env.CONNECTION_STRING

  const sequelize = new Sequelize(connectionString, {
    logging: false,
    pool: {
      max: 5,
      min: 0,
      idle: 20000,
      acquire: 20000,
    },
    retry: {
      max: 1,
    },
  })

  const CRYPTO_KITTIES = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'

  const reasons = {
    TransactionExists: 'TRANSACTION_EXISTS',
    KittyTransfer: 'KITTY_TRANSFER',
  }

  const erc721Reducer = makeERC721Reducer(
    'cryptoKitties',
    CRYPTO_KITTIES,
    reasons.KittyTransfer,
  )

  const blockReducer = makeBlockReducer('blocks')

  const reducers = [
    blockReducer,
    erc721Reducer,
  ]

  const stateReference = makeStateReference(reducers)

  const typeStore = makeRootTypeStore({
    cryptoKitties: makeERC721TypeStore(
      Sequelize,
      sequelize,
      'cryptoKitties',
    ),
    blocks: makeBlockTypeStore(
      Sequelize,
      sequelize,
    ),
  })

  const storeInterface = new SequelizePersistInterface(
    Sequelize,
    sequelize,
  )

  const gnarly = new Gnarly(
    stateReference,
    storeInterface,
    nodeEndpoint,
    typeStore,
    reducers,
  )

  let didRequestExit = false
  const gracefulExit = async () => {
    if (didRequestExit) {
      process.exit(1)
    }
    didRequestExit = true
    console.log('Gracefully exiting. Send the signal again to force exit.')
    await gnarly.bailOut()
    process.exit(0)
  }

  process.on('SIGINT', gracefulExit)
  process.on('SIGTERM', gracefulExit)

  await gnarly.reset(true)
  await gnarly.shaka(process.env.LATEST_BLOCK_HASH)
}

process.on('unhandledRejection', (error) => {
  console.error(error, error.stack)
  process.exit(1)
})

main()
  .catch((error) => {
    console.error(error, error.stack)
    process.exit(1)
  })
