import chai = require('chai')

import { IJSONBlock } from '../../src/models/Block'
import { toBN, toHex } from '../../src/utils'

import IJSONBlockFactory from '../factories/IJSONBlockFactory'

export const expectThrow = async (p) => {
  try {
    await p
    throw new chai.AssertionError('Expected promise to throw, but it did not.')
  } catch (error) {
    chai.expect(true).to.equal(true)
  }
}

export const blockAfter = (block: IJSONBlock, fork: number = 1) => IJSONBlockFactory.build({
  hash: toHex(toBN(block.hash).add(toBN(1 + 10 * fork))),
  number: toHex(toBN(block.number).add(toBN(1))),
  parentHash: block.hash,
  nonce: toHex(toBN(block.hash).add(toBN(1 + 10 * fork))),
})

export const genesis = () => [IJSONBlockFactory.build({
  hash: '0x1',
  number: '0x1',
  parentHash: '0x0',
  nonce: '0x1',
})]

export const buildChain = (from: IJSONBlock[], len: number = 10, fork: number = 1) => {
  const chain = [...from]
  for (let i = 0; i < len; i++) {
    chain.push(blockAfter(chain[chain.length - 1], fork))
  }
  return chain
}
