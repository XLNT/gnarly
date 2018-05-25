import chai = require('chai')
import spies = require('chai-spies')
import 'mocha'
import uuid = require('uuid')

import BlockStream from '../src/Blockstream'
import {
  SequelizePersistInterface,
} from '../src/stores'
import MockPersistInterface, {
  mockPatch,
  mockTransaction,
} from './helpers/MockPersistInterface'
import OurbitMock from './helpers/OurbitMock'

chai.use(spies)
const sandbox = chai.spy.sandbox()

const kittyTracker = {
  ownerOf: {},
}
const transfer = (tokenId, to) => {
  kittyTracker.ownerOf[tokenId] = to
}

describe('Blockstream', () => {
  let blockstream
  let ourbit
  let onBlock
  let stateReference
  const storeInterface = new MockPersistInterface()

  beforeEach(() => {
    sandbox.on(uuid, 'v4', () => 'mockPatch')
    onBlock = chai.spy()
    sandbox.on(storeInterface, [
      'getTransactions',
      'deleteTransaction',
      'saveTransaction',
      'getTransaction',
    ])

    stateReference = kittyTracker
    ourbit = new OurbitMock()
    sandbox.on(ourbit, [
      'processTransaction',
      'rollbackTransaction',
    ])
    blockstream = new BlockStream(ourbit, onBlock)
  })

  afterEach(() => {
    sandbox.restore()
  })

  context('start', () => {
    it('should start', async () => {
      await blockstream.start()
    })
  })
})
