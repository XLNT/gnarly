import chai = require('chai')
import 'mocha'

import { addABI, getLogs } from '../src'
import { globalState } from '../src/globalstate'

import erc20Abi from './data/erc20Abi'
import MockIngestApi from './mocks/MockIngestApi'

const NUM_LOGS = 4
const MOCK_ADDRESS = '0x0'

chai
  .should()

describe('gnarly-core exports', function () {
  beforeEach(async function () {
    globalState.setApi(new MockIngestApi(NUM_LOGS))
  })

  it('addABI works', async function () {
    addABI(MOCK_ADDRESS, erc20Abi)
  })

  it('getLogs works', async function () {
    const logs = await getLogs({})
    logs.length.should.eq(NUM_LOGS)
  })
})
