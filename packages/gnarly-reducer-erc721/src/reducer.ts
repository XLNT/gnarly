import {
  addABI,
  appendTo,
  because,
  Block,
  emit,
  getLogs,
  IReducer,
  operation,
  ReducerType,
  toHex,
} from '@xlnt/gnarly-core'

const makeReducer = (
  key: string,
  darAddress: string,
  reason: string,
): IReducer => {

  // add the abi to the global registry
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
        owner: string,
      },
    }
  }
  const erc721Tracker: IERC721Tracker = { tokens: {} }

  const makeActions = (state) => ({
    transfer: (tokenId: string, from: string, to: string) => {
      console.log(`[op] transferring token ${tokenId} to ${to}`)
      const existing = state.tokens[tokenId]
      if (existing) {
        // push
        existing.owner = to
        emit(appendTo(key, 'owners', {
          tokenId,
          address: to,
        }))
      } else {
        // init
        // order-dependent because of foreign key
        operation(() => {
          state.tokens[tokenId] = { tokenId, owner: to }
        })
        emit(appendTo(key, 'owners', {
          tokenId,
          address: to,
        }))
      }
    },
  })

  // return the reducer
  return {
    config: {
      type: ReducerType.TimeVarying,
      key,
    },
    state: erc721Tracker,
    reduce: async (state: IERC721Tracker, block: Block): Promise<void> => {
      const actions = makeActions(state)
      const logs = await getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: darAddress,
      })

      logs.forEach((log) => {
        log.parse()
        if (log.event === 'Transfer') {
          const { to, from, tokenId } = log.args

          because(reason, {}, () => {
            actions.transfer(tokenId, from, to)
          })
        }
      })
    },
  }
}

export default makeReducer
