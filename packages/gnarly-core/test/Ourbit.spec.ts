import * as chai from 'chai'
import * as spies from 'chai-spies'
import { deepClone } from 'fast-json-patch'
import 'mocha'
import * as uuid from 'uuid'

import Ourbit from '../src/Ourbit'
import { SequelizePersistInterface } from '../src/stores'
import MockPersistInterface, { mockPatch, mockTransaction } from './helpers/MockPersistInterface'

const { expect, use } = chai
use(spies)
const sandbox = chai.spy.sandbox()

const kittyTracker = {
  ownerOf: {},
}

const originalStateReference = {
  kittyTracker,
}

let stateReference

const transfer = (tokenId, to) => {
  stateReference.kittyTracker.ownerOf[tokenId] = to
}

describe('Ourbit', () => {
  let ourbit
  let persistPatchSpy
  const storeInterface = new MockPersistInterface()
  let testFn

  beforeEach(() => {
    // tslint:disable-next-line
    chai.spy.on(uuid, 'v4', () => {
      return 'mockPatch'
    })
    persistPatchSpy = chai.spy()

    stateReference = deepClone(originalStateReference)

    testFn = () => {
      transfer('0x12345', '0x0987')
    }

    sandbox.on(storeInterface, [
      'getTransactions',
      'deleteTransaction',
      'saveTransaction',
      'getTransaction',
    ])

    ourbit = new Ourbit(stateReference, storeInterface, persistPatchSpy)
  })

  afterEach(() => {
    sandbox.restore()
    // tslint:disable-next-line
    chai.spy.restore(uuid)
  })

  describe('- processTransaction()', () => {
    it('should call saveTransaction with appropriate info', async () => {
      await ourbit.processTransaction('mockTransaction', testFn)
      // tslint:disable-next-line no-unused-expression
      expect(storeInterface.saveTransaction).to.have.been.called.once
    })

    it('should call persistPatch', async () => {
      await ourbit.processTransaction('mockTransaction', testFn)
      // tslint:disable-next-line no-unused-expression
      expect(persistPatchSpy).to.have.been.called.once
    })
  })

  describe('- rollbackTransaction()', () => {
    it('should call deleteTransaction with appropriate info', async () => {
      await ourbit.processTransaction('mockTransaction', testFn)
      await ourbit.rollbackTransaction('mockTransaction')

      console.log('after:', stateReference)
      expect(storeInterface.deleteTransaction).to.have.been.called.with(mockTransaction)
    })

    it('should emit `patch` events', async () => {
      await ourbit.processTransaction('mockTransaction', testFn)

      await ourbit.rollbackTransaction('mockTransaction')
      // tslint:disable-next-line no-unused-expression
      expect(persistPatchSpy).to.have.been.called.twice
    })

    it('should rollback stateReference to previous state', async () => {
      await ourbit.processTransaction('mockTransaction', testFn)

      let ownerOf = stateReference.kittyTracker.ownerOf['0x12345']
      expect(ownerOf).to.equal('0x0987')

      await ourbit.rollbackTransaction('mockTransaction')

      ownerOf = stateReference.kittyTracker.ownerOf['0x12345']
      expect(ownerOf).to.equal(undefined)
    })
  })

  describe('- resumeFromTxId()', () => {
    it('should call getTransactions with appropriate info', async () => {
      await ourbit.resumeFromTxId('mockTransaction')

      expect(storeInterface.getTransactions).to.have.been.called.with('mockTransaction')
    })

    it('should  not emit `patch` events', async () => {
      await ourbit.resumeFromTxId('mockTransaction')
      // tslint:disable-next-line no-unused-expression
      expect(persistPatchSpy).to.not.have.been.called.once
    })

    it('should bring stateReference to current state', async () => {
      await ourbit.resumeFromTxId('mockTransaction')
      const ownerOf = stateReference.kittyTracker.ownerOf['0x12345']

      expect(ownerOf).to.equal('0x0987')
    })
  })
})
