import BN = require('bn.js')
import chai = require('chai')
import 'mocha'

import { globalState } from '../../src/globalstate'
import Block from '../../src/models/Block'
import ExternalTransaction, {
  IJSONExternalTransaction,
  isExternalTransaction,
} from '../../src/models/ExternalTransaction'
import InternalTransaction from '../../src/models/InternalTransaction'
import Log from '../../src/models/Log'
import { toBN } from '../../src/utils'

import erc20Abi from '../data/erc20Abi'
import IJSONBlockFactory from '../factories/IJSONBlockFactory'
import IJSONExternalTransactionFactory from '../factories/IJSONExternalTransactionFactory'
import IJSONInternalTransactionFactory from '../factories/IJSONInternalTransactionFactory'
import IJSONLogFactory from '../factories/IJSONLogFactory'
import MockIngestApi from '../mocks/MockIngestApi'
import { expectThrow } from '../utils'

const should = chai
  .use(require('chai-spies'))
  .use(require('bn-chai')(BN))
  .should()

const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const TRANSFER_FROM_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000001'
const TRANSFER_TO_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000002'
const TRANSFER_FROM = '0x0000000000000000000000000000000000000001'
const TRANSFER_TO = '0x0000000000000000000000000000000000000002'
const TRANSFER_DATA = '0x000000000000000000000000000000000000000000000006659436cf28180000'
const TRANSFER_VALUE = '118000000000000000000'

const MOCK_ADDRESS = '0x123'
const NUM_INTERNAL_TX = 4
const NUM_LOGS = 4
const NUM_EXT_TX = 2

describe('Models', function () {
  beforeEach(async function () {
    globalState.setApi(new MockIngestApi(NUM_LOGS, NUM_INTERNAL_TX))
  })

  describe('Block', function () {
    const bnFields = [
      'number',
      'nonce',
      'difficulty',
      'totalDifficulty',
      'size',
      'gasLimit',
      'gasUsed',
      'timestamp',
    ]

    it('can be constructed', async function () {
      const blockData = IJSONBlockFactory.build()
      const block = new Block(blockData)
      should.exist(block)
      // test instantiation
      bnFields.forEach((f) => {
        block[f].should.be.eq.BN(toBN(blockData[f]))
      })
    })

    it('maps externalTransactions to ExternalTransaction', async function () {
      const blockData = IJSONBlockFactory.build({
        transactions: IJSONExternalTransactionFactory.buildList(NUM_EXT_TX),
      })
      const block = new Block(blockData)
      block.transactions.length.should.equal(NUM_EXT_TX)
      block.transactions[0].should.be.instanceof(ExternalTransaction)
    })

    it('can load tx receipts', async function () {
      const blockData = IJSONBlockFactory.build({
        transactions: IJSONExternalTransactionFactory.buildList(NUM_EXT_TX),
      })
      const block = new Block(blockData)
      await block.loadTransactions()
      block.transactions.length.should.equal(NUM_EXT_TX)
      block.transactions[0].logs.length.should.equal(NUM_LOGS)
    })

    it('can load all transactions with tracing', async function () {
      const blockData = IJSONBlockFactory.build({
        transactions: IJSONExternalTransactionFactory.buildList(NUM_EXT_TX),
      })
      const block = new Block(blockData)
      await block.loadAllTransactions()
      // should still have 4 external txs
      block.transactions.length.should.equal(NUM_EXT_TX)
      // each external tx should have 4 internal txs
      block.allTransactions.length.should.equal(NUM_EXT_TX + (NUM_EXT_TX * NUM_INTERNAL_TX))
    })
  })

  describe('ExternalTransaction', function () {
    beforeEach(async function () {
      this.blockData = IJSONBlockFactory.build({
        transactions: IJSONExternalTransactionFactory.buildList(NUM_EXT_TX),
      })
      this.block = new Block(this.blockData)
    })

    const bnFields = [
      'nonce',
      'blockNumber',
      'value',
      'gasPrice',
      'gas',
    ]
    const receiptBNFields = ['cumulativeGasUsed', 'gasUsed', 'status']

    it('can be constructed', async function () {
      const etxData = IJSONExternalTransactionFactory.build()
      const etx = new ExternalTransaction(this.block, etxData)

      should.exist(etx)
      etx.block.should.equal(this.block)
      bnFields.forEach((f) => etx[f].should.be.eq.BN(toBN(etxData[f])))
      etx.index.should.eq.BN(toBN(etxData.transactionIndex))
    })

    it('can fetch rceipt', async function () {
      const etxData = IJSONExternalTransactionFactory.build()
      const etx = new ExternalTransaction(this.block, etxData)
      await etx.getReceipt()
      receiptBNFields.forEach((f) => etx[f].should.eq.BN(toBN('0x0')))
      etx.logs.length.should.equal(NUM_LOGS)
    })

    it('can fetch internal transactions', async function () {
      const etxData = IJSONExternalTransactionFactory.build()
      const etx = new ExternalTransaction(this.block, etxData)
      await etx.getInternalTransactions()

      etx.internalTransactions.length.should.equal(NUM_INTERNAL_TX)
    })

    it('throws for improperly formatted info', async function () {
      const badData: IJSONExternalTransaction = {} as IJSONExternalTransaction
      const fn = () => new ExternalTransaction(this.block, badData)
      fn.should.throw()
    })

    context('without tracing', function () {
      beforeEach(async function () {
        chai.spy.on(globalState.api, 'traceTransaction', () => {
          throw new Error()
         })
      })

      afterEach(async function () {
        chai.spy.restore()
      })

      it('swallows error', async function () {
        const etxData = IJSONExternalTransactionFactory.build()
        const etx = new ExternalTransaction(this.block, etxData)

        await expectThrow(etx.getInternalTransactions())
      })
    })

    context('isExternalTransaction()', function () {
      it('can identify an internal and external transaction', async function () {
        const etxData = IJSONExternalTransactionFactory.build()
        const etx = new ExternalTransaction(this.block, etxData)

        const itxData = IJSONInternalTransactionFactory.build()
        const itx = new InternalTransaction(etx, itxData)

        isExternalTransaction(etx).should.equal(true)
        isExternalTransaction(itx).should.equal(false)
      })
    })
  })

  describe('InternalTransaction', function () {
    const TEST_ERROR = '0x1'
    const TEST_OUTPUT = '0x1'
    const TEST_GAS_USED = '0x1'

    beforeEach(async function () {
      this.etxData = IJSONExternalTransactionFactory.build()
      this.etx = new ExternalTransaction(this.block, this.etxData)
    })
    // mostly tested as a side effect of the other tests
    it('should set result if error not available', async function () {
      const itxData = IJSONInternalTransactionFactory.build({ error: undefined, result: {
        output: TEST_OUTPUT,
        gasUsed: '0x1',
      } })
      const itx = new InternalTransaction(this.etx, itxData)
      itx.result.output.should.equal(TEST_OUTPUT)
      itx.result.gasUsed.should.eq.BN(toBN(TEST_GAS_USED))
    })

    it('should set error if available', async function () {
      const itxData = IJSONInternalTransactionFactory.build({ error: TEST_ERROR })
      const itx = new InternalTransaction(this.etx, itxData)
      should.not.exist(itx.result)
      itx.error.should.equal(TEST_ERROR)
    })
  })

  describe('Log', function () {
    const bnFields = [
      'logIndex',
      'blockNumber',
      'transactionIndex',
    ]
    beforeEach(async function () {
      this.blockData = IJSONBlockFactory.build({
        transactions: IJSONExternalTransactionFactory.buildList(NUM_EXT_TX),
      })
      this.block = new Block(this.blockData)

      this.etxData = IJSONExternalTransactionFactory.build()
      this.etx = new ExternalTransaction(this.block, this.etxData)
    })

    it('can be constructed', async function () {
      const logData = IJSONLogFactory.build()
      const log = new Log(this.etx, logData)
      should.exist(log)
      log.should.be.instanceof(Log)
      bnFields.forEach((f) => log[f].should.be.eq.BN(toBN(logData[f])))
    })

    context('parse()', function () {
      it('handles no available abi', async function () {
        const logData = IJSONLogFactory.build()
        const log = new Log(this.etx, logData)
        log.parse().should.equal(false)
      })

      it('handles invalid topic length', async function () {
        const logData = IJSONLogFactory.build({ address: MOCK_ADDRESS, topics: [] })
        const log = new Log(this.etx, logData)
        log.parse().should.equal(false)
      })

      it('handles not-found abi item', async function () {
        globalState.addABI(MOCK_ADDRESS, [])
        const logData = IJSONLogFactory.build({ address: MOCK_ADDRESS, topics: ['', ''] })
        const log = new Log(this.etx, logData)
        log.parse().should.equal(false)
      })

      it('handles invalid log', async function () {
        globalState.addABI(MOCK_ADDRESS, erc20Abi)
        const logData = IJSONLogFactory.build({
          address: MOCK_ADDRESS,
          topics: [
            TRANSFER_EVENT_SIGNATURE,
            '0xno',
            '0xno',
          ],
          data: '0x0',
        })
        const log = new Log(this.etx, logData)
        log.parse().should.equal(false)
      })

      it('should be able to parse valid log for abi item', async function () {
        globalState.addABI(MOCK_ADDRESS, erc20Abi)
        const logData = IJSONLogFactory.build({
          address: MOCK_ADDRESS,
          topics: [
            TRANSFER_EVENT_SIGNATURE,
            TRANSFER_FROM_TOPIC,
            TRANSFER_TO_TOPIC,
          ],
          data: TRANSFER_DATA,
        })
        const log = new Log(this.etx, logData)
        log.parse().should.equal(true)

        log.event.should.equal('Transfer(address,address,uint256)')
        log.eventName.should.equal('Transfer')
        log.signature.should.equal(TRANSFER_EVENT_SIGNATURE)
        const args = log.args as any
        args.from.should.equal(TRANSFER_FROM)
        args.to.should.equal(TRANSFER_TO)
        args.value.should.equal(TRANSFER_VALUE)
      })
    })
  })
})
