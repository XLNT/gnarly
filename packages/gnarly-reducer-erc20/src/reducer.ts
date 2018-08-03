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
const MINT_REASON = 'ERC20_MINT'
const BURN_REASON = 'ERC20_BURN'

const isZeroAddress = (address: string) => address === '0x0000000000000000000000000000000000000000'

const makeReducer = (key: string, typeStore: ITypeStore) => (
  tokenAddress: string,
): IReducer => {
  addABI(tokenAddress, abi)

  interface IERC20Tracker {
    balances: {
      [id: string]: {
        id: string,
        tokenAddress: string;
        owner: string;
        balance: string;
        balanceStr: string;
      },
    },
  }

  const makeActions = (state: IERC20Tracker, { operation, emit }) => ({
    transfer: (from: string, to: string, rawTokenValue: string) => {
      debug('transferring %d tokens from %s to %s', rawTokenValue, from, to)

      // turn rawTokenValue into BN tokenValue
      const tokenValue = new BN(rawTokenValue)

      // hacky composite key for O(n) lookups required by JSON-Patch
      const fromId = `${tokenAddress}-${from}`
      const toId = `${tokenAddress}-${to}`

      // create new addresses' states which are missing
      // order dependent, operations must be done before appendTo
      if (!state.balances[fromId]) {
        operation(() => {
          const balance = tokenValue.toString()

          state.balances[fromId] = {
            id: fromId,
            tokenAddress,
            owner: from,
            balance,
            balanceStr: balance,
          }
        })
      }

      if (!state.balances[toId]) {
        const balance = '0'

        operation(() => {
          state.balances[toId] = {
            id: toId,
            tokenAddress,
            owner: to,
            balance,
            balanceStr: balance,
          }
        })
      }

      operation(() => {
        const fromBalance = new BN(state.balances[fromId].balance).sub(tokenValue).toString()
        // ^ subtract from sender
        const toBalance = new BN(state.balances[toId].balance).add(tokenValue).toString()
        // ^ add to receiver

        state.balances[fromId].balance = fromBalance
        state.balances[fromId].balanceStr = fromBalance

        state.balances[toId].balance = toBalance
        state.balances[toId].balanceStr = toBalance
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
        address: tokenAddress,
      })

      logs.forEach((log) => {
        log.parse()
        if (log.eventName === 'Transfer') {
          const { from, to, value } = log.args
          let reason = TRANSFER_REASON

          if (isZeroAddress(from)) {
            reason = MINT_REASON
          } else if (isZeroAddress(to)) {
            reason = BURN_REASON
          }

          because(reason, {}, () => {
            actions.transfer(from, to, value)
          })
        }
      })
    },
  }
}

export default makeReducer
