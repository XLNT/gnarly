import chai = require('chai')
import 'mocha'

import Blockstream from '../src/Blockstream'
import { globalState } from '../src/globalstate'
import { IJSONBlock } from '../src/models/Block'
import { toBN, toHex } from '../src/utils'

import IJSONBlockFactory from './factories/IJSONBlockFactory'
import MockIngestApi from './mocks/MockIngestApi'

const blockAfter = (block: IJSONBlock, fork: number = 1) => IJSONBlockFactory.build({
  hash: toHex(toBN(block.hash).add(toBN(1 + 10 * fork))),
  number: toHex(toBN(block.number).add(toBN(1))),
  parentHash: block.hash,
  nonce: toHex(toBN(block.hash).add(toBN(1 + 10 * fork))),
})

const genesis = () => [IJSONBlockFactory.build()]

const buildChain = (from: IJSONBlock[], len: number = 10, fork: number = 1) => {
  const chain = [...from]
  for (let i = 0; i < len - 1; i++) {
    chain.push(blockAfter(chain[chain.length - 1], fork))
  }
  return chain
}

const MOCK_REDUCER_KEY = 'test'

const should = chai
  .use(require('chai-spies'))
  .should()

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

    globalState.setApi(new MockIngestApi())
    chai.spy.on(globalState.api, 'getLatestBlock', function () {
      return realChain[realChain.length - 1]
    })
    chai.spy.on(globalState.api, 'getBlockByHash', function (hash) {
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
      await bs.initWithHistoricalBlocks(realChain)

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
        const accurateChain = buildChain(genesis(), 8)
        const shortLivedFork = buildChain(accurateChain, 2, 1)
        const invalidBlocks = [shortLivedFork[shortLivedFork.length - 2], shortLivedFork[shortLivedFork.length - 1]]
        realChain = shortLivedFork
        const bs = new Blockstream(
          MOCK_REDUCER_KEY,
          this.processTransaction,
          this.rollbackTransaction,
          this.onNewBlock,
        )
        const onBlockAdd = chai.spy.on(bs, 'onBlockAdd')
        const onBlockInvalidated = chai.spy.on(bs, 'onBlockInvalidated')
        await bs.initWithHistoricalBlocks(realChain)

        const newChain = buildChain(accurateChain, 2, 2)
        const validBlocks = [[newChain[newChain.length - 2], newChain[newChain.length - 1]]]
        realChain = newChain

        // tell blockstreamer that the last two blocks it saw were actually invalid by giving it a new longer chain
        await bs.start() // HEAD

        onBlockInvalidated.should.have.been.called()
        console.log('ok')

        onBlockInvalidated.should.have.been.called.with(invalidBlocks[0])
        onBlockInvalidated.should.have.been.called.with(invalidBlocks[1])

        onBlockAdd.should.have.been.called.with(validBlocks[0])
        onBlockAdd.should.have.been.called.with(validBlocks[1])
      })
    })
  })
})
