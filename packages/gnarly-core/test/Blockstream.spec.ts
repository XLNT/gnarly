import chai = require('chai')
import 'mocha'

import Blockstream from '../src/Blockstream'
import { globalState } from '../src/globalstate'
import { IJSONBlock } from '../src/models/Block'
import { forEach, timeout, toBN, toHex } from '../src/utils'

import BlockStream from '../src/Blockstream'
import IJSONBlockFactory from './factories/IJSONBlockFactory'
import MockIngestApi from './mocks/MockIngestApi'
import MockPersistInterface from './mocks/MockPersistInterface'

const blockAfter = (block: IJSONBlock, fork: number = 1) => IJSONBlockFactory.build({
  hash: toHex(toBN(block.hash).add(toBN(1 + 10 * fork))),
  number: toHex(toBN(block.number).add(toBN(1))),
  parentHash: block.hash,
  nonce: toHex(toBN(block.hash).add(toBN(1 + 10 * fork))),
})

const genesis = () => [IJSONBlockFactory.build({
  hash: '0x1',
  number: '0x1',
  parentHash: '0x0',
  nonce: '0x1',
})]

const buildChain = (from: IJSONBlock[], len: number = 10, fork: number = 1) => {
  const chain = [...from]
  for (let i = 0; i < len; i++) {
    chain.push(blockAfter(chain[chain.length - 1], fork))
  }
  return chain
}

const MOCK_REDUCER_KEY = 'test'

const should = chai
  .use(require('chai-spies'))
  .should()

const bootstrapHistoricalBlocks = async (reducerKey: string, blocks, store: MockPersistInterface, bs: BlockStream) => {
  await forEach(blocks, async (block) => store.saveHistoricalBlock(reducerKey, 100, block), { concurrency: 1 })
  await bs.initWithHistoricalBlocks(blocks)
}

let realChain = [] as IJSONBlock[]
describe.only('Blockstream', function () {
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

  context('with historical blocks', function () {
    it('should init with historical blocks and not call any handlers', async function () {
      realChain = buildChain(genesis(), 10)
      const bs = new Blockstream(
        MOCK_REDUCER_KEY,
        this.processTransaction,
        this.rollbackTransaction,
        this.onNewBlock,
      )

      const onBlockAdd = chai.spy.on(bs, 'onBlockAdd')
      const onBlockInvalidated = chai.spy.on(bs, 'onBlockInvalidated')
      await bootstrapHistoricalBlocks(MOCK_REDUCER_KEY, realChain, this.store, bs)

      onBlockAdd.should.not.have.been.called()
      onBlockInvalidated.should.not.have.been.called()
      this.processTransaction.should.not.have.been.called()
      this.rollbackTransaction.should.not.have.been.called()
      this.onNewBlock.should.not.have.been.called()
    })

    context('when presented with a future block within retention', function () {
      it('should fast forward and trigger add handlers')
    })

    context('when presented with a future block beyond retention', function () {
      it('should fast forward manually and then defer to blockstream while triggering add handlers')
    })

    context('when presentend with a short lived fork', function () {
      it('calls rollbackTransaction with the offending blocks', async function () {
        const accurateChain = buildChain(genesis(), 7) // 8 blocks long
        const shortLivedFork = buildChain(accurateChain, 2, 1) // 10 blocks long
        const invalidBlocks = [
          shortLivedFork[shortLivedFork.length - 2],
          shortLivedFork[shortLivedFork.length - 1],
        ]
        realChain = shortLivedFork
        const bs = new Blockstream(
          MOCK_REDUCER_KEY,
          this.processTransaction,
          this.rollbackTransaction,
          this.onNewBlock,
        )
        const onBlockAdd = chai.spy.on(bs, 'onBlockAdd')
        const onBlockInvalidated = chai.spy.on(bs, 'onBlockInvalidated')
        await bootstrapHistoricalBlocks(MOCK_REDUCER_KEY, realChain, this.store, bs)

        // tell blockstreamer that the last two blocks it saw were actually invalid by giving it a new longer chain
        await bs.start()
        const newChain = buildChain(accurateChain, 3, 2) // 11 blocks long
        const validBlocks = [
          newChain[newChain.length - 3],
          newChain[newChain.length - 2],
          newChain[newChain.length - 1],
        ]
        realChain = newChain
        await this.api.forceSendBlock()
        await timeout(100) // give it time to call the handlers
        await bs.stop()

        onBlockInvalidated.should.have.been.called()

        invalidBlocks.forEach((block) =>
          onBlockInvalidated.should.have.been.called.with(block),
        )
        validBlocks.forEach((block) =>
          onBlockAdd.should.have.been.called.with(block),
        )
      })
    })
  })
})
