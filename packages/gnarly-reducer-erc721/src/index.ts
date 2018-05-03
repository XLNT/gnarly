import { observable } from 'mobx'
import { IStateTreeNode, types } from 'mobx-state-tree'

import Gnarly, {
  addABI,
  addressesEqual,
  because,
  Block,
  forEach,
  getLogs,
  IReducer,
  ReducerType,
  SequelizeJSONArrayTypeStore,
  SequelizeMapTypeStore,
  toHex,
} from '@xlnt/gnarly-core'

import sequelizeModels from './models/sequelize'

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
    .model(key, {
      ownerOf: types.optional(types.map(types.string), {}),
      ownershipHistory: types.optional(
        types.map(
          // @TODO - why doesn't optional array with default work here?
          types.array(types.string),
        ),
      {}),
    })
    .actions((self) => ({
      setOwner (tokenId, to) {
        const history = self.ownershipHistory.get(tokenId)
        if (history) {
          history.push(to)
        } else {
          self.ownershipHistory.set(tokenId, observable([to]))
        }
        self.ownerOf.set(tokenId, to)
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
    reduce: async (state: IERC721Tracker, block: Block): Promise<void> => {
      const logs = await getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: darAddress,
      })

      logs.forEach((log) => {
        log.parse()
        if (log.event === 'Transfer') {
          const { to, tokenId } = log.args

          because(reason, {}, () => {
            state.setOwner(tokenId, to)
          })
        }
      })
    },
  }
}

export const makeSequelizeTypeStore = (
  key: string,
  sequelize: any,
  DataTypes: any,
) => {
  const {
    ERC721OwnerOf,
    ERC721OwnershipHistory,
  } = sequelizeModels(key, sequelize, DataTypes)

  // the type store
  return {
    __setup: async (reset: boolean = false) => {
      await ERC721OwnerOf.sync({ force: reset })
      await ERC721OwnershipHistory.sync({ force: reset })
    },
    ownerOf: SequelizeMapTypeStore(ERC721OwnerOf, {
      key: 'tokenId',
      value: 'owner',
    }),
    ownershipHistory: SequelizeJSONArrayTypeStore(ERC721OwnershipHistory, {
      key: 'tokenId',
      value: 'owners',
    }),
  }
}

export default makeReducer
