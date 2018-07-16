import dotenv = require('dotenv')
dotenv.config()

import makeDebug = require('debug')
const debug = makeDebug('gnarly')

/**
 * @TODO - handle lazy-require, config-based bootstrapping
 */
import Sequelize = require('sequelize')

import Gnarly, {
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

const CRYPTO_KITTIES_ADDRESS = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'
const ETHER_GOO_ADDRESS = '0x57b116da40f21f91aec57329ecb763d29c1b2355'

import etherGooAbi from './abis/EtherGoo'

enum Keys {
  CryptoKitties = 'cryptoKitties',
  Blocks = 'blocks',
  Events = 'events',
}

const main = async () => {
  const nodeEndpoint = process.env.NODE_ENDPOINT
  const connectionString = process.env.DB_CONNECTION_STRING

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

  const erc721Reducer = makeERC721Reducer(Keys.CryptoKitties, makeERC721TypeStore(
    Sequelize,
    sequelize,
  ))(
    CRYPTO_KITTIES_ADDRESS,
  )

  const blockReducer = makeBlockReducer(Keys.Blocks, makeBlockTypeStore(
    Sequelize,
    sequelize,
  ))(
  )

  const eventsReducer = makeEventsReducer(Keys.Events, makeEventsTypeStore(
    Sequelize,
    sequelize,
  ))({
    [ETHER_GOO_ADDRESS]: etherGooAbi,
  })

  const reducers = [
    blockReducer,
    erc721Reducer,
    eventsReducer,
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
  console.error('unhandledRejection:', error, error.stack)
  process.exit(1)
})

main()
  .catch((error) => {
    console.error(error, error.stack)
    process.exit(1)
  })
