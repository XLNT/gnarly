import * as chai from 'chai'
import 'mocha'

import uuid = require('uuid')
import { globalState } from '../src/globalstate'
import * as utils from '../src/utils'

import Ourbit, {
  ITransaction,
} from '../src/ourbit'
import { ReducerContext } from '../src/reducer'
import MockPersistInterface from './mocks/MockPersistInterface'

chai
  .use(require('chai-spies'))
  .should()
const sandbox = chai.spy.sandbox()

const TEST_KEY = 'test'
const TEST_REASON = 'TEST_REASON'
const TEST_META = {}

describe('Ourbit', () => {
  let ourbit: Ourbit = null

  let tx: ITransaction
  let targetState
  let persistPatch
  let context

  const produceFirstPatch = async () => {
    await ourbit.processTransaction(tx.id, async () => {
      targetState.key = 'value'
    }, { blockHash: tx.blockHash })
  }

  beforeEach(() => {
    sandbox.on(uuid, 'v4', () => 'uuid')
    sandbox.on(globalState, [
      'setPatchGenerator',
      'setOpCollector',
      'getReason',
    ])

    tx = {
      id: '0x1',
      blockHash: '0x1',
      patches: [{
        id: 'uuid',
        reason: undefined,
        operations: [{
          op: 'add',
          path: '/key',
          value: 'value',
          volatile: false,
        }],
      }],
    }

    targetState = {}
    const store = new MockPersistInterface()
    sandbox.on(store, [
      'saveTransaction',
    ])
    globalState.setStore(store)
    context = new ReducerContext(TEST_KEY)

    persistPatch = chai.spy()
    ourbit = new Ourbit(TEST_KEY, targetState, persistPatch, context)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should process a transaction', async () => {
    await produceFirstPatch()

    globalState.store.saveTransaction.should.have.been.called.with(TEST_KEY, tx)
  })

  it('should process a transaction with default values', async () => {
    await ourbit.processTransaction(tx.id, async () => {
      targetState.key = 'value'
    })

    const txWithoutBlockHash = tx
    tx.blockHash = ''

    globalState.store.saveTransaction.should.have.been.called.with(TEST_KEY, txWithoutBlockHash)
  })

  it('should include a reason if provided', async () => {
    tx.patches[0].reason = { key: TEST_REASON, meta: TEST_META }

    await ourbit.processTransaction(tx.id, async () => {
      context.because(TEST_REASON, TEST_META, () => {
        targetState.key = 'value'
      })
    }, { blockHash: tx.blockHash })

    globalState.store.saveTransaction.should.have.been.called.with(TEST_KEY, tx)
  })

  it('should allow manual collection', async () => {
    tx.patches.push({
      id: 'uuid',
      reason: undefined,
      operations: [{
        op: 'replace',
        path: '/key',
        oldValue: 'value',
        value: 'newValue',
        volatile: false,
      }],
    })

    await ourbit.processTransaction(tx.id, async () => {
      context.operation(() => {
        targetState.key = 'value'
      })
      context.operation(() => {
        targetState.key = 'newValue'
      })
    }, { blockHash: tx.blockHash })

    globalState.store.saveTransaction.should.have.been.called.with(TEST_KEY, tx)
  })

  it('should accept volatile operations', async () => {
    targetState.domain = { array: [] }
    tx.patches.push({
      id: 'uuid',
      reason: undefined,
      operations: [{
        op: 'add',
        path: '/domain/uuid',
        value: { uuid: 'uuid', value: 'value' },
        volatile: true,
      }],
    })

    await ourbit.processTransaction(tx.id, async () => {
      context.operation(() => {
        targetState.key = 'value'
      })
      context.emit(utils.appendTo('domain', {
        value: 'value',
      }))
    }, { blockHash: tx.blockHash })

    globalState.store.saveTransaction.should.have.been.called.with(TEST_KEY, tx)
  })

  it('should revert transactions', async () => {
    await produceFirstPatch()
    targetState.should.deep.equal({ key: 'value' })

    await ourbit.processTransaction('0x2', async () => {
      targetState.key = 'newValue'
    }, { blockHash: '0x2' })

    await ourbit.rollbackTransaction('0x2')
    targetState.should.deep.equal({ key: 'value' })

    await ourbit.rollbackTransaction(tx.id)
    targetState.should.deep.equal({})
  })

  it('should be able to resume transactions after failure', async () => {
    await produceFirstPatch()

    const newState = {}
    // new state, same store
    const newOurbit = new Ourbit(TEST_KEY, newState, persistPatch, context)

    await newOurbit.resumeFromTxId('0x1')
    newState.should.deep.equal({ key: 'value' })
  })
})
