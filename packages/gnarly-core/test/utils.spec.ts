import { expect } from 'chai'
import * as spies from 'chai-spies'
import 'mocha'

import { splitPath } from '../src/utils'

describe('Utils', () => {
  const reducerKey = 'kittyTracker'
  const domainKey = 'ownerOf'
  const key = '0x123'
  const testString = `/${reducerKey}/${domainKey}/${key}`
  const extraTestString = `/${reducerKey}/${domainKey}/${key}/5/6`

  describe('- splitPath', () => {
    it('should return an object with four keys', () => {
      const returnSplit = splitPath(testString)
      expect(returnSplit).to.be.an('Object')
      expect(Object.keys(returnSplit)).to.have.lengthOf(4)
    })
    it('should return reducerKey, domainKey, and key with correct values', () => {
      const returnSplit = splitPath(testString)
      expect(returnSplit.reducerKey).to.equal(reducerKey)
      expect(returnSplit.domainKey).to.equal(domainKey)
      expect(returnSplit.key).to.equal(key)
      expect(returnSplit.extra).to.deep.equal([])
    })
    it('should parse extra', () => {
      const returnSplit = splitPath(extraTestString)
      expect(returnSplit.extra).to.deep.equal(['5', '6'])
    })
  })
})
