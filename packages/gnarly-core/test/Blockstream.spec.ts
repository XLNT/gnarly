import chai = require('chai')
import 'mocha'

import { globalState } from '../src/globalstate'
import { IJSONBlock } from '../src/models/Block'

import Blockstream from '../src/Blockstream'
import MockIngestApi from './mocks/MockIngestApi'

const MOCK_REDUCER_KEY = 'test'

const should = chai
  .use(require('chai-spies'))
  .should()

describe('Blockstream', function () {
  beforeEach(async function () {
    this.realChain = [] as IJSONBlock[]

    globalState.setApi(new MockIngestApi())
    chai.spy.on(globalState.api, 'getBlockByHash', (hash) => {
      return this.realChain.find((b) => b.hash === hash)
    })
  })

  afterEach(async function () {
    chai.spy.restore()
  })

  context('instantiation', function () {
    const processTransaction = async (txId: string, fn: () => Promise<void>, extra: object) => {
      await fn()
    }

    const rollbackTransaction = async (blockHash: string) => {
      return
    }

    const onNewBlock = (block: IJSONBlock, syncing: boolean) => async () => {

    }

    it('can be constructed', async function () {
      const bs = new Blockstream(
        MOCK_REDUCER_KEY,
        processTransaction,
        rollbackTransaction,
        onNewBlock,
      )
    })
    it('handles default args', async function () {

    })
  })
})
