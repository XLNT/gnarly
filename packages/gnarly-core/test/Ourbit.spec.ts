import { deepClone } from '@xlnt/fast-json-patch'
import chai = require('chai')
import spies = require('chai-spies')
import 'mocha'
import uuid = require('uuid')
import { globalState } from '../src/globalstate'
import * as utils from '../src/utils'

import Ourbit, {
  ITransaction,
} from '../src/ourbit'
import {
  IPersistInterface,
  SequelizePersistInterface,
} from '../src/stores'
import MockPersistInterface from './helpers/MockPersistInterface'

chai.use(spies)
chai.should()
const sandbox = chai.spy.sandbox()

const TEST_REASON = 'TEST_REASON'
const TEST_META = {}

describe('Ourbit', () => {
  let store: IPersistInterface
  let ourbit: Ourbit = null

  let tx: ITransaction
  let targetState
  let persistPatch

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
    store = new MockPersistInterface()

    sandbox.on(store, [
      'saveTransaction',
    ])

    globalState.setStore(store)

    persistPatch = chai.spy()
    ourbit = new Ourbit('test', targetState, persistPatch)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should process a transaction', async () => {
    await produceFirstPatch()

    store.saveTransaction.should.have.been.called.with(tx)
  })

  it('should include a reason if provided', async () => {
    tx.patches[0].reason = { key: TEST_REASON, meta: TEST_META }

    await ourbit.processTransaction(tx.id, async () => {
      globalState.because(TEST_REASON, TEST_META, () => {
        targetState.key = 'value'
      })
    }, { blockHash: tx.blockHash })

    store.saveTransaction.should.have.been.called.with(tx)
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
      globalState.operation(() => {
        targetState.key = 'value'
      })
      globalState.operation(() => {
        targetState.key = 'newValue'
      })
    }, { blockHash: tx.blockHash })

    store.saveTransaction.should.have.been.called.with(tx)
  })

  it('should accept volatile operations', async () => {
    targetState.store = { domain: { array: [] } }
    tx.patches.push({
      id: 'uuid',
      reason: undefined,
      operations: [{
        op: 'add',
        path: '/store/domain/uuid',
        value: { uuid: 'uuid', value: 'value' },
        volatile: true,
      }],
    })

    await ourbit.processTransaction(tx.id, async () => {
      globalState.operation(() => {
        targetState.key = 'value'
      })
      globalState.emit(utils.appendTo('store', 'domain', {
        value: 'value',
      }))
    }, { blockHash: tx.blockHash })

    store.saveTransaction.should.have.been.called.with(tx)
  })

  it('should revert transactions', async () => {
    await produceFirstPatch()
    targetState.should.deep.equal({ key: 'value' })

    await ourbit.processTransaction('0x2', async () => {
      targetState.key = 'newValue'
    }, { blockHash: tx.blockHash })

    await ourbit.rollbackTransaction('0x2')
    targetState.should.deep.equal({ key: 'value' })

    await ourbit.rollbackTransaction(tx.id)
    targetState.should.deep.equal({})
  })

  it('should be able to resume transactions after failure', async () => {
    await produceFirstPatch()

    const newState = {}
    // new state, same store
    const newOurbit = new Ourbit('test', newState, persistPatch)

    await newOurbit.resumeFromTxId('0x1')
    newState.should.deep.equal({ key: 'value' })
  })
})
