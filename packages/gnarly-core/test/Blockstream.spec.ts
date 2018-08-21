import chai = require('chai')
import 'mocha'

import Blockstream from '../src/Blockstream'
import { globalState } from '../src/globalstate'
import { IJSONBlock } from '../src/models/Block'
import { forEach, timeout, toBN, toHex } from '../src/utils'

import MockIngestApi from './mocks/MockIngestApi'
import MockPersistInterface from './mocks/MockPersistInterface'
import { buildChain, genesis } from './utils'

const RETENTION = 20
const MOCK_REDUCER_KEY = 'test'
const WAIT_FOR_HANDLERS = 100 // wait 100ms for handlers to be called

const should = chai
  .use(require('chai-spies'))
  .should()

const bootstrapHistoricalBlocks = async (reducerKey: string, blocks, store: MockPersistInterface, bs: Blockstream) => {
  await forEach(blocks, async (block) => store.saveHistoricalBlock(reducerKey, 100, block), { concurrency: 1 })
  await bs.initWithHistoricalBlocks(blocks)
}

let realChain = [] as IJSONBlock[]
describe('Blockstream', function () {
  beforeEach(async function () {

    this.processTransaction = chai.spy(async function (txId: string, fn: () => Promise<void>, extra: object) {
      await fn()
    })

    this.rollbackTransaction = chai.spy(async function (blockHash: string) {
      return
    })

    this.onNewBlock = chai.spy(function (block: IJSONBlock, syncing: boolean) {
      return function () {
        //
      }
    })

    this.api = new MockIngestApi()
    this.store = new MockPersistInterface()
    globalState.setApi(this.api)
    globalState.setStore(this.store)

    chai.spy.on(this.api, 'getLatestBlock', function () {
      return realChain[realChain.length - 1]
    })
    chai.spy.on(this.api, 'getBlockByHash', function (hash) {
      return realChain.find((b) => b.hash === hash)
    })
    chai.spy.on(this.api, 'getBlockByNumber', function (num) {
      return realChain.find((b) => b.number === toHex(num))
    })

    this.bs = new Blockstream(
      MOCK_REDUCER_KEY,
      this.processTransaction,
      this.rollbackTransaction,
      this.onNewBlock,
      RETENTION,
    )

    this.onBlockAdd = chai.spy.on(this.bs, 'onBlockAdd')
    this.onBlockInvalidated = chai.spy.on(this.bs, 'onBlockInvalidated')
  })

  afterEach(async function () {
    chai.spy.restore()
  })

  context('instantiation', function () {
    it('can be constructed', async function () {
      const bs = new Blockstream(
        MOCK_REDUCER_KEY,
        this.processTransaction,
        this.rollbackTransaction,
        this.onNewBlock,
        1,
      )
      should.exist(bs)
    })

    it('handles default args', async function () {
      const bs = new Blockstream(
        MOCK_REDUCER_KEY,
        this.processTransaction,
        this.rollbackTransaction,
        this.onNewBlock,
      )
      should.exist(bs)
    })
  })

  context('without historical blocks', function () {

    beforeEach(async function () {
      realChain = buildChain(genesis(), 8)

      await this.bs.start()
      await this.api.forceSendBlock()
      await timeout(WAIT_FOR_HANDLERS)
    })

    it('should start from head and only add the first block', async function () {
      await timeout(WAIT_FOR_HANDLERS)
      await this.bs.stop()

      this.onBlockAdd.should.have.been.called.exactly(1)
      this.onBlockInvalidated.should.not.have.been.called()
      this.processTransaction.should.have.been.called.exactly(1)
      this.rollbackTransaction.should.not.have.been.called()
      this.onNewBlock.should.have.been.called.exactly(1)
    })

    it('should add new blocks when presented', async function () {
      realChain = buildChain(realChain, 2)
      const newBlocks = realChain.slice(-2)

      await this.api.forceSendBlock()
      await timeout(WAIT_FOR_HANDLERS)
      await this.bs.stop()

      newBlocks.forEach((block) =>
        this.onNewBlock.should.have.been.called.with(block),
      )
    })

    it('should invalidate forked blocks', async function () {
      const shortFork = buildChain(realChain, 2, 1)
      const invalidBlocks = shortFork.slice(-2)
      const validChain = buildChain(realChain, 3, 2)
      const validBlocks = validChain.slice(-3)

      realChain = shortFork
      await this.api.forceSendBlock()
      await timeout(WAIT_FOR_HANDLERS)

      invalidBlocks.forEach((block) =>
        this.onBlockAdd.should.have.been.called.with(block),
      )

      realChain = validChain
      await this.api.forceSendBlock()
      await timeout(WAIT_FOR_HANDLERS)
      await this.bs.stop()

      invalidBlocks.forEach((block) =>
        this.onBlockInvalidated.should.have.been.called.with(block),
      )
      validBlocks.forEach((block) => {
        this.onBlockAdd.should.have.been.called.with(block)
        this.onNewBlock.should.have.been.called.with(block)
      })
    })
  })

  context('with historical blocks', function () {
    it('should init with historical blocks and not call any handlers', async function () {
      realChain = buildChain(genesis(), 8)
      await bootstrapHistoricalBlocks(MOCK_REDUCER_KEY, realChain, this.store, this.bs)

      this.onBlockAdd.should.not.have.been.called()
      this.onBlockInvalidated.should.not.have.been.called()
      this.processTransaction.should.not.have.been.called()
      this.rollbackTransaction.should.not.have.been.called()
      this.onNewBlock.should.not.have.been.called()
    })

    context('when presented with a future block within retention', function () {
      beforeEach(async function () {
        this.localChain = buildChain(genesis(), 7) // 8 blocks long
        this.remoteChain = buildChain(this.localChain, 12) // 20 blocks long
        this.newBlocks = this.remoteChain.slice(-12)
        realChain = this.localChain

        await bootstrapHistoricalBlocks(MOCK_REDUCER_KEY, realChain, this.store, this.bs)
        // now set the real chain to the remote chain
        realChain = this.remoteChain
        await this.bs.start(this.localChain[this.localChain.length - 1].hash) // from HEAD
        await this.api.forceSendBlock()
        await timeout(WAIT_FOR_HANDLERS)
      })

      it('should fast forward and trigger add handlers', async function () {
        await this.bs.stop()
        this.newBlocks.forEach((block) => {
          this.onBlockAdd.should.have.been.called.with(block)
          this.onNewBlock.should.have.been.called.with(block)
        })
      })

      it('should not have invalided any blocks', async function () {
        await this.bs.stop()
        this.onBlockInvalidated.should.not.have.been.called()
      })
    })

    context('when presented with a future block beyond retention', function () {
      beforeEach(async function () {
        realChain = buildChain(genesis(), 8)
        await bootstrapHistoricalBlocks(MOCK_REDUCER_KEY, realChain, this.store, this.bs)

        const lastLocalBlock = realChain[realChain.length - 1]
        const remoteLength = RETENTION + 10 // 10 blocks past retention limit
        this.remoteChain = buildChain(realChain, remoteLength)
        this.newBlocks = this.remoteChain.slice(-1 * remoteLength)

        realChain = this.remoteChain
        await this.bs.start(lastLocalBlock.hash) // start from the local HEAD

        await this.api.forceSendBlock()
        await timeout(WAIT_FOR_HANDLERS)
      })

      it('should fast forward manually and then defer to blockstream while triggering add handlers', async function () {
        this.newBlocks.forEach((block) => {
          this.onBlockAdd.should.have.been.called.with(block)
          this.onNewBlock.should.have.been.called.with(block)
        })
      })
    })

    context('when presentend with a short lived fork', function () {
      beforeEach(async function () {
        const accurateChain = buildChain(genesis(), 7) // 8 blocks long
        const shortLivedFork = buildChain(accurateChain, 2, 1) // 10 blocks long
        this.invalidBlocks = shortLivedFork.slice(-2)
        realChain = shortLivedFork

        await bootstrapHistoricalBlocks(MOCK_REDUCER_KEY, realChain, this.store, this.bs)
        // tell blockstreamer that the last two blocks it saw were actually invalid by giving it a new longer chain
        await this.bs.start()
        const newChain = buildChain(accurateChain, 3, 2) // 11 blocks long
        this.validBlocks = newChain.slice(-3)
        realChain = newChain
        await this.api.forceSendBlock()
        await timeout(WAIT_FOR_HANDLERS)
      })

      it('calls rollbackTransaction with the offending blocks', async function () {
        await this.bs.stop()

        this.onBlockInvalidated.should.have.been.called()
        this.invalidBlocks.forEach((block) =>
          this.onBlockInvalidated.should.have.been.called.with(block),
        )
        this.validBlocks.forEach((block) =>
          this.onBlockAdd.should.have.been.called.with(block),
        )
      })
    })

    context('when presented with hella blocks', function () {
      it('should throttle to queue limit')
    })
  })
})
