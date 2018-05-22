import {
  addABI,
  appendTo,
  because,
  Block,
  emit,
  forEach,
  getLogs,
  IABIItemInput,
  ILog,
  IReducer,
  ReducerType,
  toHex,
} from '@xlnt/gnarly-core'
import flatten = require('arr-flatten')

// all events are part of the same domain
const key = 'events'

const makeReducer = (
  config: { [_: string]: IABIItemInput[] } = {},
): IReducer => {
  const addrs = Object.keys(config)

  // add the abis to the global registry
  for (const addr of addrs) {
    addABI(addr, config[addr])
  }

  const makeActions = (state: undefined) => ({
    emit: (log: ILog) => {
      emit(appendTo(key, 'events', {
        address: log.address,
        event: log.event,
        eventName: log.eventName,
        signature: log.signature,
        args: log.args,
      }))
    },
  })

  return {
    config: {
      type: ReducerType.Atomic,
      key,
    },
    state: undefined,
    reduce: async (state: undefined, block: Block): Promise<void> => {
      const actions = makeActions(state)
      const logs = await forEach(addrs, async (addr) => getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: addr,
      }))

      flatten(logs).forEach((log) => {
        const recognized = log.parse()
        if (recognized) {
          because('EVENT_EMITTED', {}, () => {
            actions.emit(log)
          })
        }
      })
    },
  }
}

export default makeReducer
