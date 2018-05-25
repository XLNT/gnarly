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

describe('utils', () => {
  before(() => {
    chai.spy.on(uuid, 'v4', () => 'uuid')
  })

  after(() => {
    chai.spy.restore()
  })
  context('parsePath', () => {
    it('should parse path correctly', async () => {
      const parts = utils.parsePath('/scope/tableName/pk/indexOrKey')
      Object.keys(parts).should.deep.equal(Object.values(parts))
    })

    it('should parse path without index correctly', async () => {
      const parts = utils.parsePath('/scope/tableName/pk')
      parts.scope.should.equal('scope')
      parts.tableName.should.equal('tableName')
      parts.pk.should.equal('pk')
      should.not.exist(parts.indexOrKey)
    })
  })

  context('addressesEqual', () => {
    it('should work on mixed case addresses', async () => {
      utils.addressesEqual('0x1', '0x1').should.eq(true)
      utils.addressesEqual('0xA', '0xA').should.eq(true)
      utils.addressesEqual('0xA', '0xa').should.eq(true)
      utils.addressesEqual('0xa', '0xA').should.eq(true)
    })

    it('should detect non equal addresses', async () => {
      utils.addressesEqual('0x1', '0x2').should.eq(false)
    })
  })

  context('enhanceAbiItem', () => {
    it('should produce name, sig, shortId', async () => {
      const enhanced = utils.enhanceAbiItem(TRANSFER_ABI)
      enhanced.fullName.should.eq('Transfer(address,address,uint256)')
      enhanced.signature.should.eq('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef')
      enhanced.shortId.should.eq('0xddf252ad')
      // ^^ https://www.4byte.directory/signatures/?bytes4_signature=0xddf252ad
    })
  })

  context('getMethodId', () => {
    it('works', async () => {
      utils.getMethodId(
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      ).should.eq('0xddf252ad')
    })
  })

  context('invertOperation', () => {
    it('inverts an add operation', async () => {
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

    it('inverts a remove operation', async () => {
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

    it('inverts a replace operation', async () => {
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

    it('should throw on invalid operation', async () => {
      const invalid: IOperation = {
        op: 'move',
        path: '/myThing',
        volatile: false,
      }
      const test = () => {
        utils.invertOperation(invalid)
      }
      test.should.throw()
    })

    it('silently fails on non-invertable operation', async () => {
      // @TODO(shrugs) - should this succeed or fail??
      const nonInvertable: IOperation = {
        op: 'add',
        path: '/myThing',
        volatile: false,
      }
      const test = () => {
        utils.invertOperation(nonInvertable)
      }
      test.should.not.throw()
    })
  })

  context('appendTo', () => {
    it('generates a valid op', async () => {
      const op = utils.appendTo('key', 'domain', { test: true })
      op.op.should.eq('add')
      op.path.should.eq('/key/domain/uuid')
      op.value.should.deep.eq({
        uuid: 'uuid',
        test: true,
      })
    })
  })
})
