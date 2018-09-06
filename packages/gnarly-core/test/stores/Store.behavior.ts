import chai = require('chai')
import { pickBy } from 'lodash'
import 'mocha'

const should = chai
  .use(require('chai-spies'))
  .use(require('chai-as-promised'))
  .should()

import { ITransaction } from '../../src/ourbit'
import { forEach, uuid } from '../../src/utils'
import IPatchFactory from '../factories/IPatchFactory'
import IOperationFactory from '../factories/IPatchFactory'
import ITransactionFactory from '../factories/ITransactionFactory'
import { buildChain, genesis } from '../utils'

const flattenIterable = async (iter) => {
  const memo = []
  for await (const batch of iter) {
    for (const thing of batch) {
      memo.push(thing)
    }
  }
  return memo
}

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

const transactionKeys = ['id', 'patches', 'blockNumber', 'blockHash']
const patchKeys = ['id', 'operations']
const operationKeys = ['id', 'path', 'op', 'value', 'oldValue', 'volatile']

const transactionsWithValidKeys = (txs) => txs
  .map(onlyKeys(transactionKeys))
  .map((tx) => ({
    ...tx,
    patches: tx.patches
      .map(onlyKeys(patchKeys))
      .map((patch) => ({
        ...patch,
        operations: patch.operations.map(onlyKeys(operationKeys)),
      })),
  }))

const transactionsShouldEqual = (as, bs) => transactionsWithValidKeys(as)
  .should.deep.equal(transactionsWithValidKeys(bs))

const shouldBehaveAsStore = function () {
  const saveAllHistoricalBlocks = async function (store, blocks)  {
    return forEach(blocks, (block) =>
      store.saveHistoricalBlock(MOCK_REDUCER_KEY, MOCK_RETENTION, block),
    )
  }

  beforeEach(async function () {
    // implicitly tests setup and setdown
    await this.store.setdown()
    await this.store.setup()
  })

  context('reducers', function () {
    describe('saveReducer', function () {
      it('should save reducer information', async function () {
        await this.store.saveReducer(MOCK_REDUCER_KEY)
      })
    })

    describe('deleteReducer', function () {
      it('should delete reducer information', async function () {
        await this.store.saveReducer(MOCK_REDUCER_KEY)
        await this.store.deleteReducer(MOCK_REDUCER_KEY)
      })
    })
  })

  context('with reducer', function () {
    beforeEach(async function () {
      await this.store.saveReducer(MOCK_REDUCER_KEY)
    })
    afterEach(async function () {
      await this.store.deleteReducer(MOCK_REDUCER_KEY)
    })

    context('historical blocks', function () {
      describe('saveHistoricalBlock & getHistoricalBlocks', function () {
        beforeEach(async function () {
          this.historicalBlocks = buildChain(genesis(), 8)
          this.lastBlock = this.historicalBlocks[this.historicalBlocks.length - 1]
        })

        it('should return empty array if no historical blocks', async function () {
          const blocks = await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(0)
        })

        it('should save one historical block', async function () {
          await this.store.saveHistoricalBlock(MOCK_REDUCER_KEY, MOCK_RETENTION, this.lastBlock)
          const blocks = await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(1)
          blocksShouldEqual(blocks, [this.lastBlock])
        })

        it('should save many historical blocks', async function () {
          await saveAllHistoricalBlocks(this.store, this.historicalBlocks)

          const blocks = await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(this.historicalBlocks.length)
          blocksShouldEqual(blocks, this.historicalBlocks)
        })
      })

      describe('deleteHistoricalBlock', function () {
        beforeEach(async function () {
          this.historicalBlocks = buildChain(genesis(), 8)
          this.lastBlock = this.historicalBlocks[this.historicalBlocks.length - 1]
          await saveAllHistoricalBlocks(this.store, this.historicalBlocks)
        })

        it('should delete a single historical block', async function () {
          await this.store.deleteHistoricalBlock(MOCK_REDUCER_KEY, this.lastBlock.hash)
          const blocks = await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocksShouldEqual(blocks, this.historicalBlocks.slice(0, -1))
        })
      })

      describe('deleteHistoricalBlocks', function () {
        beforeEach(async function () {
          this.historicalBlocks = buildChain(genesis(), 8)
          await saveAllHistoricalBlocks(this.store, this.historicalBlocks)
        })

        it('should delete all historical blocks', async function () {
          await this.store.deleteHistoricalBlocks(MOCK_REDUCER_KEY)
          const blocks = await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY)
          blocks.length.should.equal(0)
        })
      })

      context('integration', function () {
        context('with historical blocks below retention', async function () {
          beforeEach(async function () {
            this.historicalBlocks = buildChain(genesis(), MOCK_RETENTION - 1)
          })

          it('should still have the same number of blocks', async function () {
            await saveAllHistoricalBlocks(this.store, this.historicalBlocks)
            const blocks = await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY)
            blocks.length.should.equal(this.historicalBlocks.length)
          })
        })

        context('with historical blocks above retention', async function () {
          beforeEach(async function () {
            this.historicalBlocks = buildChain(genesis(), MOCK_RETENTION + 1)
          })

          it('should delete historical blocks beyond retention', async function () {
            await saveAllHistoricalBlocks(this.store, this.historicalBlocks)
            const blocks = await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY)
            blocks.length.should.equal(MOCK_RETENTION)

            blocksShouldEqual(blocks, this.historicalBlocks.slice(-1 * MOCK_RETENTION))
          })
        })

        it('should go through happy path with reverts', async function () {
          // save initial 8 blocks
          const base = buildChain(genesis(), 6)
          const fork1 = buildChain(base, 2)
          const fork2 = buildChain(base, MOCK_RETENTION)
          await saveAllHistoricalBlocks(this.store, fork1)

          // should be fork1
          blocksShouldEqual(await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY), fork1)

          // delete extra fork1 blocks
          await forEach(fork1.slice(-2), (block) => this.store.deleteHistoricalBlock(MOCK_REDUCER_KEY, block.hash))

          // should be base
          blocksShouldEqual(await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY), base)

          // add fork2 blocks which goes above retention
          await saveAllHistoricalBlocks(this.store, fork2.slice(-1 * MOCK_RETENTION))

          // should be last retention blocks of fork2
          blocksShouldEqual(await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY), fork2.slice(-1 * MOCK_RETENTION))

          // nuke all of them
          await this.store.deleteHistoricalBlocks(MOCK_REDUCER_KEY)

          // should be empty
          blocksShouldEqual(await this.store.getHistoricalBlocks(MOCK_REDUCER_KEY), [])
        })
      })
    })

    context('transactions', function () {
      describe('getAllTransactionsTo', function () {
        it('should throw error when given undefined txId', async function () {
          await this.store.getAllTransactionsTo(MOCK_REDUCER_KEY, undefined).should.be.rejectedWith(Error)
        })

        it('should throw error when given null txId', async function () {
          await this.store.getAllTransactionsTo(MOCK_REDUCER_KEY, null).should.be.rejectedWith(Error)
        })

        it('should throw error when given unknown txId', async function () {
          await this.store.getAllTransactionsTo(MOCK_REDUCER_KEY, 'fake').should.be.rejectedWith(Error)
        })

        context('with valid transactions', function () {
          beforeEach(async function () {
            this.mockTransactions = [
              ITransactionFactory.build({
                patches: [
                  IPatchFactory.build({
                    operations: [IOperationFactory.build({
                      path: '/test',
                      op: 'add',
                      value: 'test',
                      oldValue: null,
                      volatile: false,
                    })],
                  }),
                  IPatchFactory.build({
                    operations: [IOperationFactory.build({
                      path: '/test-2',
                      op: 'add',
                      value: 'test',
                      oldValue: null,
                      volatile: false,
                    })],
                  }),
                ],
                blockNumber: '0x1',
                blockHash: '0x1',
              }),
              ITransactionFactory.build({
                patches: [IPatchFactory.build({
                  operations: [IOperationFactory.build({
                    path: '/test',
                    op: 'update',
                    value: 'new',
                    oldValue: 'test',
                    volatile: false,
                  })],
                })],
                blockNumber: '0x2',
                blockHash: '0x2',
              }),
            ]

            for (const tx of this.mockTransactions) {
              await this.store.saveTransaction(MOCK_REDUCER_KEY, tx)
            }

            this.lastTxId = this.mockTransactions[this.mockTransactions.length - 1].id
          })

          it('should return an AsyncIteratorable', async function () {
            const iter = await this.store.getAllTransactionsTo(MOCK_REDUCER_KEY, this.lastTxId)

            should.exist(iter[(Symbol as any).asyncIterator])
          })

          it('should return all transactions up to an existing txId (inclusive) ordered correctly', async function () {
            const txs = await flattenIterable(await this.store.getAllTransactionsTo(MOCK_REDUCER_KEY, this.lastTxId))

            should.exist(txs)
            txs.length.should.equal(this.mockTransactions.length)
            transactionsShouldEqual(txs, this.mockTransactions)
          })

          it('should not include volatile operations')
          it('should include operations ordered correctly')
        })
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
