import chai = require('chai')
import spies = require('chai-spies')
import 'mocha'
import uuid = require('uuid')

import { IABIItemInput } from '../src'

import { IOperation } from '../src/Ourbit'
import * as utils from '../src/utils'

chai.use(spies)
const should = chai.should()

const TRANSFER_ABI: IABIItemInput = {
  anonymous: false,
  inputs: [
    { indexed: true, name: 'from', type: 'address' },
    { indexed: true, name: 'to', type: 'address' },
    { indexed: false, name: 'tokens', type: 'uint256' },
  ],
  name: 'Transfer',
  type: 'event',
}

describe('utils', function () {
  before(function () {
    chai.spy.on(uuid, 'v4', () => 'uuid')
  })

  after(function () {
    chai.spy.restore()
  })
  context('parsePath', function () {
    it('should parse path correctly', async function () {
      const parts = utils.parsePath('/scope/tableName/pk/indexOrKey')
      Object.keys(parts).should.deep.equal(Object.values(parts))
    })

    it('should parse path without index correctly', async function () {
      const parts = utils.parsePath('/scope/tableName/pk')
      parts.scope.should.equal('scope')
      parts.tableName.should.equal('tableName')
      parts.pk.should.equal('pk')
      should.not.exist(parts.indexOrKey)
    })
  })

  context('addressesEqual', function () {
    it('should work on mixed case addresses', async function () {
      utils.addressesEqual('0x1', '0x1').should.eq(true)
      utils.addressesEqual('0xA', '0xA').should.eq(true)
      utils.addressesEqual('0xA', '0xa').should.eq(true)
      utils.addressesEqual('0xa', '0xA').should.eq(true)
    })

    it('should detect non equal addresses', async function () {
      utils.addressesEqual('0x1', '0x2').should.eq(false)
    })
  })

  context('enhanceAbiItem', function () {
    it('should produce name, sig, shortId', async function () {
      const enhanced = utils.enhanceAbiItem(TRANSFER_ABI)
      enhanced.fullName.should.eq('Transfer(address,address,uint256)')
      enhanced.signature.should.eq('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
      enhanced.shortId.should.eq('0xddf252ad')
      // ^^ https://www.4byte.directory/signatures/?bytes4_signature=0xddf252ad
    })
  })

  context('getMethodId', function () {
    it('works', async function () {
      utils.getMethodId(
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      ).should.eq('0xddf252ad')
    })
  })

  context('invertOperation', function () {
    it('inverts an add operation', async function () {
      const add: IOperation = {
        op: 'add',
        path: '/myThing',
        value: { test: true },
        volatile: false,
      }
      const inverted = utils.invertOperation(add)
      // the invert of an add is a removal at the same path
      inverted.path.should.eq(add.path)
      inverted.op.should.eq('remove')
      should.not.exist(inverted.value)
      inverted.oldValue.should.eq(add.value)
    })

    it('inverts a remove operation', async function () {
      const remove: IOperation = {
        op: 'remove',
        path: '/myThing',
        oldValue: { test: true },
        volatile: false,
      }
      const inverted = utils.invertOperation(remove)
      // the invert of a remove is an add of the old value at that path
      inverted.path.should.eq(remove.path)
      inverted.op.should.eq('add')
      inverted.value.should.eq(remove.oldValue)
      should.not.exist(inverted.oldValue)
    })

    it('inverts a replace operation', async function () {
      const replace: IOperation = {
        op: 'replace',
        path: '/myThing',
        value: { new: true },
        oldValue: { new: false },
        volatile: false,
      }
      const inverted = utils.invertOperation(replace)
      // the invert of a replace just swaps value/oldValue
      inverted.path.should.eq(replace.path)
      inverted.op.should.eq('replace')
      inverted.value.should.eq(replace.oldValue)
      inverted.oldValue.should.eq(replace.value)
    })

    it('should throw on invalid operation', async function () {
      const invalid: IOperation = {
        op: 'move',
        path: '/myThing',
        volatile: false,
      }
      const test = function () {
        utils.invertOperation(invalid)
      }
      test.should.throw()
    })

    it('silently fails on non-invertable operation', async function () {
      // @TODO(shrugs) - should this succeed or fail??
      const nonInvertable: IOperation = {
        op: 'add',
        path: '/myThing',
        volatile: false,
      }
      const test = function () {
        utils.invertOperation(nonInvertable)
      }
      test.should.not.throw()
    })
  })

  context('appendTo', function () {
    it('generates a valid op', async function () {
      const op = utils.appendTo('key', 'domain', { test: true })
      op.op.should.eq('add')
      op.path.should.eq('/key/domain/uuid')
      op.value.should.deep.eq({
        uuid: 'uuid',
        test: true,
      })
      op.volatile.should.eq(true)
    })
  })

  context('cacheApiRequest', function () {

    beforeEach(async function () {
      this.spy = chai.spy()
      const fn = async (arg: number) => {
        this.spy(arg)
        return arg
      }

      this.memoized = utils.cacheApiRequest(fn)
    })

    afterEach(async function () {
      this.memoized.clear()
    })

    it ('should memoize the function that returns a promise', async function () {
      await this.memoized(1)
      await this.memoized(1)

      this.spy.should.have.been.called.exactly(1)
      this.spy.should.have.been.called.with(1)
    })

    // it('should expire after maxAge', async function () {
    //   // this test is annnoying to run, but it should work
    //   this.timeout(2500)
    //   await this.memoized(1)
    //   await utils.timeout(2000)
    //   await this.memoized(1)

    //   this.spy.should.have.been.called.exactly(2)
    // })
  })
})
