import BN = require('bn.js')
import makeDebug = require('debug')
const debug = makeDebug('gnarly-reducer:erc20')

import {
  addABI,
  Block,
  getLogs,
  IReducer,
  ITypeStore,
  ReducerType,
  toHex,
} from '@xlnt/gnarly-core'

import abi from './abi'

const TRANSFER_REASON = 'ERC20_TRANSFER'

const makeReducer = (key: string, typeStore: ITypeStore) => (
  darAddress: string,
): IReducer => {
  addABI(darAddress, abi)

  interface IERC20Tracker {
    balances: {
      [id: string]: {
        id: string,
        darAddress: string;
        owner: string;
        balance: string;
      },
    },
  }

  const makeActions = (state: IERC20Tracker, { operation, emit }) => ({
    transfer: (from: string, to: string, value: string) => {
      debug('transferring %d tokens from %s to %s', value, from, to)

      // turn value into BN value
      value = new BN(value)

      // hacky composite key for O(n) lookups required by JSON-Patch
      const fromId = `${darAddress}-${from}`
      const toId = `${darAddress}-${to}`

      // create new addresses' states which are missing
      // order dependent, operations must be done before appendTo
      if (!state.balances[fromId]) {
        operation(() => {
          state.balances[fromId] = {
            id: fromId,
            darAddress,
            owner: from,
            balance: value.toString(),
          }
        })
      }

      if (!state.balances[toId]) {
        operation(() => {
          state.balances[toId] = {
            id: toId,
            darAddress,
            owner: to,
            balance: '0',
          }
        })
      }

      operation(() => {
        state.balances[fromId].balance = new BN(state.balances[fromId].balance).sub(value).toString()
        state.balances[toId].balance = new BN(state.balances[toId].balance).add(value).toString()
      })
    },
  })

  return {
    config: {
      type: ReducerType.TimeVarying,
      key,
      typeStore,
    },
    state: { balances: {} },
    reduce: async (
      state: IERC20Tracker,
      block: Block,
      { because, operation, emit },
    ): Promise<void> => {
      const actions = makeActions(state, { operation, emit })
      const logs = await getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: darAddress,
      })

      logs.forEach((log) => {
        log.parse()
        if (log.eventName === 'Transfer') {
          const { from, to, value } = log.args

          because(TRANSFER_REASON, {}, () => {
            actions.transfer(from, to, value)
          })
        }
      })
    },
  }
}

export default makeReducer
