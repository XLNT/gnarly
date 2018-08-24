import chai = require('chai')
import { pickBy } from 'lodash'
import 'mocha'

chai
  .use(require('chai-spies'))
  .should()

import { forEach } from '../../src/utils'

import { IPersistInterface } from '../../src/stores'
import { buildChain, genesis } from '../utils'

const MOCK_REDUCER_KEY = 'test'
const MOCK_RETENTION = 100

const onlyKeys = (keys: string[]) => (thing: object) => pickBy(thing, (value, key) => keys.includes(key))

const historialBlockKeys = [
  'hash',
  'number',
  'parentHash',
]

const blocksShouldEqual = (as, bs) => as.map(onlyKeys(historialBlockKeys))
  .should.deep.equal(
    bs.map(onlyKeys(historialBlockKeys)),
  )

const shouldBehaveAsStore = (store: IPersistInterface) => {
  const saveAllHistoricalBlocks = async (blocks) => forEach(blocks, (block) =>
    store.saveHistoricalBlock(MOCK_REDUCER_KEY, MOCK_RETENTION, block),
  )

  beforeEach(async function () {
    // implicitly tests setup and setdown
    await store.setdown()
    await store.setup()
  })

  context('reducers', function () {
    describe('saveReducer', function () {
      it('should save reducer information', async function () {
        await store.saveReducer(MOCK_REDUCER_KEY)
      })
    })

    describe('deleteReducer', function () {
      it('should delete reducer information', async function () {
        await store.saveReducer(MOCK_REDUCER_KEY)
        await store.deleteReducer(MOCK_REDUCER_KEY)
      })
    })
  })

  context('with reducer', function () {
    beforeEach(async function () {
      await store.saveReducer(MOCK_REDUCER_KEY)
    })
    afterEach(async function () {
      await store.deleteReducer(MOCK_REDUCER_KEY)
    })

    context('historical blocks', function () {
      describe('saveHistoricalBlock & getHistoricalBlocks', function () {
        beforeEach(async function () {
          this.historicalBlocks = buildChain(genesis(), 8)
          this.lastBlock = this.historicalBlocks[this.historicalBlocks.length - 1]
        })

        it('should return empty array if no historical blocks', async function () {
          const blocks = await store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(0)
        })

        it('should save one historical block', async function () {
          await store.saveHistoricalBlock(MOCK_REDUCER_KEY, MOCK_RETENTION, this.lastBlock)
          const blocks = await store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(1)
          blocksShouldEqual(blocks, [this.lastBlock])
        })

        it('should save many historical blocks', async function () {
          await saveAllHistoricalBlocks(this.historicalBlocks)

          const blocks = await store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(this.historicalBlocks.length)
          blocksShouldEqual(blocks, this.historicalBlocks)
        })
      })

      describe('deleteHistoricalBlock', function () {
        beforeEach(async function () {
          this.historicalBlocks = buildChain(genesis(), 8)
          this.lastBlock = this.historicalBlocks[this.historicalBlocks.length - 1]
          await saveAllHistoricalBlocks(this.historicalBlocks)
        })

        it('should delete a single historical block', async function () {
          await store.deleteHistoricalBlock(MOCK_REDUCER_KEY, this.lastBlock.hash)
          const blocks = await store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocksShouldEqual(blocks, this.historicalBlocks.slice(0, -1))
        })
      })

      describe('deleteHistoricalBlocks', function () {
        beforeEach(async function () {
          this.historicalBlocks = buildChain(genesis(), 8)
          await saveAllHistoricalBlocks(this.historicalBlocks)
        })

        it('should delete all historical blocks', async function () {
          await store.deleteHistoricalBlocks(MOCK_REDUCER_KEY)
          const blocks = await store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(0)
        })
      })

      context('integration', function () {
        context('with historical blocks below retention', async function () {
          beforeEach(async function () {
            this.historicalBlocks = buildChain(genesis(), MOCK_RETENTION - 1)
          })

          it('should still have the same number of blocks', async function () {
            await saveAllHistoricalBlocks(this.historicalBlocks)
            const blocks = await store.getHistoricalBlocks(MOCK_REDUCER_KEY)
            blocks.length.should.equal(this.historicalBlocks.length)
          })
        })

        context('with historical blocks above retention', async function () {
          beforeEach(async function () {
            this.historicalBlocks = buildChain(genesis(), MOCK_RETENTION + 1)
          })

          it('should delete historical blocks beyond retention', async function () {
            await saveAllHistoricalBlocks(this.historicalBlocks)
            const blocks = await store.getHistoricalBlocks(MOCK_REDUCER_KEY)
            blocks.length.should.equal(MOCK_RETENTION)

            blocksShouldEqual(blocks, this.historicalBlocks.slice(-1 * MOCK_RETENTION))
          })
        })

        it('should go through happy path with reverts', async function () {
          // save initial 8 blocks
          const base = buildChain(genesis(), 6)
          const fork1 = buildChain(base, 2)
          const fork2 = buildChain(base, MOCK_RETENTION)
          await saveAllHistoricalBlocks(fork1)

          // should be fork1
          blocksShouldEqual(await store.getHistoricalBlocks(MOCK_REDUCER_KEY), fork1)

          // delete extra fork1 blocks
          await forEach(fork1.slice(-2), (block) => store.deleteHistoricalBlock(MOCK_REDUCER_KEY, block.hash))

          // should be base
          blocksShouldEqual(await store.getHistoricalBlocks(MOCK_REDUCER_KEY), base)

          // add fork2 blocks which goes above retention
          await saveAllHistoricalBlocks(fork2.slice(-1 * MOCK_RETENTION))

          // should be last retention blocks of fork2
          blocksShouldEqual(await store.getHistoricalBlocks(MOCK_REDUCER_KEY), fork2.slice(-1 * MOCK_RETENTION))

          // nuke all of them
          await store.deleteHistoricalBlocks(MOCK_REDUCER_KEY)

          // should be empty
          blocksShouldEqual(await store.getHistoricalBlocks(MOCK_REDUCER_KEY), [])
        })
      })
    })

    context('transactions', function () {
      describe('getAllTransactionsTo', function () {
        it('should throw error when given unknown txId')
        it('should return an AsyncIteratorable set of tx batches')
        it('should return all transactions up to an existing txId (inclusive) ordered correctly')
        it('should include patches ordered correctly')
        it('should not include volatile operations')
        it('should include operations ordered correctly')
      })

      describe('getLatestTransaction', function () {
        it('should throw if there are no transactions')
        it('should return the latest transaction')
      })

      describe('deleteTransaction', function () {
        it('should not error on unknown transaction')
        it('should delete a specific transaction')
      })

      describe('saveTransaction', function () {
        it('should save a specific transaction')
      })

      describe('getTransaction', function () {
        it('should throw error for unknown txId')
        it('should return a specific transaction by id')
        it('should include volatile operations')
      })

      describe('getTransactionByBlockHash', function () {
        it('should throw error for unknown blockHash')
        it('should return a specific transaction by blockHash')
        it('should include volatile operations')
      })
    })
  })
}

export default shouldBehaveAsStore
