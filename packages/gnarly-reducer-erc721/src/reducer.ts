import makeDebug = require('debug')
const debug = makeDebug('gnarly-reducer:erc721')

import {
  addABI,
  appendTo,
  because,
  Block,
  emit,
  getLogs,
  IReducer,
  ITypeStore,
  operation,
  ReducerType,
  toHex,
} from '@xlnt/gnarly-core'

const TRANSFER_REASON = 'ERC721_TRANSFER'

const makeReducer = (
  key: string,
  typeStore: ITypeStore,
) => (
  darAddress: string,
): IReducer => {

  // add the abi to the global registry
  // @TODO(shrugs): add the full abi as a constant
  addABI(darAddress, [{
    anonymous: false,
    inputs: [
      { indexed: false, name: 'from', type: 'address' },
      { indexed: false, name: 'to', type: 'address' },
      { indexed: false, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  }, {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_tokenId', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  }])

  interface IERC721Tracker {
    tokens: { // 1:1
      [id: string]: {
        tokenId: string,
        darAddress: string,
        owner: string,
      },
    }
  }

  const makeActions = (state) => ({
    transfer: (tokenId: string, from: string, to: string) => {
      debug('transferring token %s to %s', tokenId, to)

      const existing = state.tokens[tokenId]
      if (existing) {
        // push
        existing.owner = to
        emit(appendTo('owners', {
          tokenId,
          address: to,
        }))
      } else {
        // init
        // order-dependent because of foreign key
        operation(() => {
          state.tokens[tokenId] = { tokenId, darAddress, owner: to }
        })
        emit(appendTo('owners', {
          tokenId,
          address: to,
        }))
      }
    },
  })

  return {
    config: {
      type: ReducerType.TimeVarying,
      key,
      typeStore,
    },
    state: { tokens: {} },
    reduce: async (state: IERC721Tracker, block: Block): Promise<void> => {
      const actions = makeActions(state)
      const logs = await getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: darAddress,
      })

      logs.forEach((log) => {
        log.parse()
        if (log.eventName === 'Transfer') {
          const { to, from, tokenId } = log.args

          because(TRANSFER_REASON, {}, () => {
            actions.transfer(tokenId, from, to)
          })
        }
      })
    },
  }
}

export default makeReducer
