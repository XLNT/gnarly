import { observable } from 'mobx'
import { types } from 'mobx-state-tree'

import {
  addABI,
  addressesEqual,
  because,
  Block,
  forEach,
  getLogs,
  IReducer,
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

  // create the state type
  const ERC721Tracker = types
    .model({
      // a table with primary, unique keys
      tokens: types.map(
        types.model({
          tokenId: types.string,
          owner: types.string,
        }),
      ),
      // a table with foreign keys
      owners: types.map( // [identifier]: types.array
        types.array(
          types.model({
            tokenId: types.string,
            address: types.string,
          }),
        ),
      ),
    })
    .actions((self) => ({
      transfer (tokenId, from, to) {
        console.log(`[op] transferring token ${tokenId} to ${to}`)
        const existing = self.tokens.get(tokenId)
        if (existing) {
          existing.owner = to
          self.owners.get(tokenId).push({ tokenId, address: to })
        } else {
          // init
          self.tokens.set(tokenId, { tokenId, owner: to })
          // @TODO - figure out why the setted array _must_ be observable
          self.owners.set(tokenId, observable([{ tokenId, address: to }]))
        }
      },
    }))

  type IERC721Tracker = typeof ERC721Tracker.Type

  // return the reducer
  return {
    config: {
      type: ReducerType.TimeVarying,
      key,
    },
    stateType: ERC721Tracker,
    createState: () => ERC721Tracker.create({ tokens: {}, owners: {} }),
    reduce: async (state: IERC721Tracker, block: Block): Promise<void> => {
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
            state.transfer(tokenId, from, to)
          })
        }
      })
    },
  }
}

export default makeReducer
