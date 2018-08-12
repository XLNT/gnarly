import chai = require('chai')
import 'mocha'

import { GnarlyGlobals } from '../src/globalstate'
import Log from '../src/models/Log'
import { enhanceAbiItem } from '../src/utils'

import MockIngestApi from './mocks/MockIngestApi'
import MockPersistInterface from './mocks/MockPersistInterface'

import erc20Abi from './data/erc20Abi'

const NUM_LOGS = 4
const MOCK_ADDRESS = '0x0'
const TRANSFER_METHOD_ID = '0xa9059cbb'

const should = chai
  .use(require('chai-spies'))
  .should()

describe('globalstate', function () {
  beforeEach(async function () {
    this.globals = new GnarlyGlobals()
  })

  context('api', function () {
    beforeEach(async function () {
      this.api = new MockIngestApi()
    })

    it('can set/get api', async function () {
      this.globals.setApi(this.api)
      this.globals.api.should.equal(this.api)
    })
  })

  context('store', function () {
    beforeEach(async function () {
      this.store = new MockPersistInterface()
    })

    it('can set/get store', async function () {
      this.globals.setStore(this.store)
      this.globals.store.should.equal(this.store)
    })
  })

  context('abis', function () {
    describe('addABI()', function () {
      it('can add an abi', async function () {
        this.globals.addABI(MOCK_ADDRESS, erc20Abi)

        this.globals.abis[MOCK_ADDRESS].length.should.equal(erc20Abi.length)
      })
    })

    context('with no abis', function () {
      it('getABI() returns undefined', async function () {
        should.not.exist(this.globals.getABI(MOCK_ADDRESS))
      })

      it('getMethod() returns undefined', async function () {
        should.not.exist(this.globals.getMethod(MOCK_ADDRESS, TRANSFER_METHOD_ID))
      })
    })

    context('with valid abi', function () {
      beforeEach(async function () {
        this.globals.addABI(MOCK_ADDRESS, erc20Abi)
      })

      it('can getABI()', async function () {
        const abiSet = this.globals.getABI(MOCK_ADDRESS)
        abiSet.length.should.equal(erc20Abi.length)
      })

      it('should have enhanced the abi', async function () {
        const firstAbi = erc20Abi[0]
        const gotAbi = this.globals.getABI(MOCK_ADDRESS)[0]
        enhanceAbiItem(firstAbi).should.deep.equal(gotAbi)
      })

      it('can getMethod()', async function () {
        const method = this.globals.getMethod(MOCK_ADDRESS, TRANSFER_METHOD_ID)
        method.shortId.should.equal(TRANSFER_METHOD_ID)
      })
    })
  })

  context('getLogs()', function () {
    context('without logs', function () {
      beforeEach(async function () {
        this.api = new MockIngestApi(0)
        this.globals.setApi(this.api)
      })

      it('returns empty array', async function () {
        const logs = await this.globals.getLogs({})

        logs.length.should.equal(0)
      })
    })

    context('with logs', function () {
      beforeEach(async function () {
        this.api = new MockIngestApi(NUM_LOGS)
        this.globals.setApi(this.api)
      })

      it('can getLogs()', async function () {
        const logs = await this.globals.getLogs({})

        logs.length.should.equal(NUM_LOGS)
        logs.map((l) => l.should.be.instanceof(Log))
      })
    })
  })
})
