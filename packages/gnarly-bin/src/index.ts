import dotenv = require('dotenv')
dotenv.config()

import makeDebug = require('debug')
const debug = makeDebug('gnarly')

/**
 * @TODO - handle lazy-require, config-based bootstrapping
 */
import Sequelize = require('sequelize')

import Gnarly, {
  makeRootTypeStore,
  SequelizePersistInterface,
  Web3Api,
} from '@xlnt/gnarly-core'

import makeERC721Reducer, {
  makeSequelizeTypeStore as makeERC721TypeStore,
} from '@xlnt/gnarly-reducer-erc721'

import makeBlockReducer, {
  makeSequelizeTypeStore as makeBlockTypeStore,
} from '@xlnt/gnarly-reducer-block-meta'

import makeEventsReducer, {
  makeSequelizeTypeStore as makeEventsTypeStore,
} from '@xlnt/gnarly-reducer-events'

const CRYPTO_KITTIES = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'
const ETHER_GOO = '0x57b116da40f21f91aec57329ecb763d29c1b2355'

import etherGooAbi from './abis/EtherGoo'

enum Keys {
  CryptoKitties = 'cryptoKitties',
  Blocks = 'blocks',
  Events = 'events',
}

const main = async () => {
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
      // @TODO(shrugs) ^ make this configurable with a default of ~3
    },
  })

  // @TODO(shrugs) - make the key implicit somehow
  const erc721Reducer = makeERC721Reducer(Keys.CryptoKitties, makeERC721TypeStore(
    Sequelize,
    sequelize,
    Keys.CryptoKitties,
  ))(
    CRYPTO_KITTIES,
    'KITTY_TRANSFER',
  )

  const blockReducer = makeBlockReducer(Keys.Blocks, makeBlockTypeStore(
    Sequelize,
    sequelize,
  ))(
  )

  const gooEventReducer = makeEventsReducer(Keys.Events, makeEventsTypeStore(
    Sequelize,
    sequelize,
  ))({
    [ETHER_GOO]: etherGooAbi,
    [CRYPTO_KITTIES]: etherGooAbi,
  })

  const reducers = [
    blockReducer,
    erc721Reducer,
    gooEventReducer,
  ]

  const store = new SequelizePersistInterface(
    Sequelize,
    sequelize,
  )

  const ingestApi = new Web3Api(nodeEndpoint)

  const gnarly = new Gnarly(
    ingestApi,
    store,
    reducers,
  )

  let didRequestExit = false
  const gracefulExit = async () => {
    if (didRequestExit) {
      process.exit(1)
    }
    didRequestExit = true
    debug('Gracefully exiting. Send the signal again to force exit.')
    await gnarly.bailOut()
    process.exit(0)
  }

  process.on('SIGINT', gracefulExit)
  process.on('SIGTERM', gracefulExit)

  await gnarly.reset(process.env.GNARLY_RESET === 'true')
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
