import * as chai from 'chai'
import * as spies from 'chai-spies'
import { clone, types } from 'mobx-state-tree'
import 'mocha'
import * as uuid from 'uuid'

import BlockStream from '../src/Blockstream'
import Ourbit from '../src/Ourbit'
import { SequelizePersistInterface } from '../src/stores'
import MockPersistInterface, { mockPatch, mockTransaction } from './helpers/MockPersistInterface'

chai.use(spies)
const sandbox = chai.spy.sandbox()

// Helpers
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

describe('Blockstream', () => {
  let blockstream
  let ourbit
  let onBlockSpy
  let persistPatchSpy
  let stateReference
  const storeInterface = new MockPersistInterface()

  beforeEach(() => {
    // tslint:disable-next-line
    chai.spy.on(uuid, 'v4', () => {
      return 'mockPatch'
    })

    stateReference = Store.create({
      kittyTracker: KittyTracker.create(),
    })

    onBlockSpy = chai.spy()
    persistPatchSpy = chai.spy()
    sandbox.on(storeInterface, ['getTransactions', 'deleteTransaction', 'saveTransaction', 'getTransaction'])

    ourbit = new Ourbit(stateReference, storeInterface, persistPatchSpy)
    blockstream = new BlockStream(ourbit, onBlockSpy)
  })

  afterEach(() => {
    sandbox.restore()
    // tslint:disable-next-line
    chai.spy.restore(uuid)
  })

  describe('- start()', () => {
  })

  describe('- stop()', () => {
  })
})
