import { observable } from 'mobx'
import { types } from 'mobx-state-tree'

import {
  addABI,
  addressesEqual,
  because,
  Block,
  forEach,
  getLogs,
  IABIItemInput,
  IReducer,
  ReducerType,
  toHex,
} from '@xlnt/gnarly-core'

const makeReducer = (
  key: string,
  config: { [_: string]: IABIItemInput[] } = {},
): IReducer => {

  const addrs = Object.keys(config)

  // add the abis to the global registry
  for (const addr of addrs) {
    addABI(addr, config[addr])
  }

  // create the state type
  const EventTracker = types
    .model({
      events: types.array(
        types.model({
          address: types.string,
          event: types.string,
          eventName: types.string,
          signature: types.string,
          args: types.frozen,
        }),
      ),
    })
    .actions((self) => ({
      emit (log) {
        self.events.push({
          address: log.address,
          event: log.event,
          eventName: log.eventName,
          signature: log.signature,
          args: log.args,
        })
      },
    }))

  type IEventTracker = typeof EventTracker.Type

  // return the reducer
  return {
    config: {
      type: ReducerType.TimeVarying,
      key,
    },
    stateType: EventTracker,
    createState: () => EventTracker.create({ events: [] }),
    reduce: async (state: IEventTracker, block: Block): Promise<void> => {
      const logs = await forEach(addrs, async (addr) => getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: addr,
      }))

      logs.flatten().forEach((log) => {
        const recognized = log.parse()
        if (recognized) {
          because('EVENT_EMITTED', {}, () => {
            state.emit(log)
          })
        }
      })
    },
  }
}

export default makeReducer
