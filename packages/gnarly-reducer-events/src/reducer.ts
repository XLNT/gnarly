import {
  addABI,
  appendTo,
  Block,
  EmitOperationFn,
  forEach,
  getLogs,
  IABIItemInput,
  ILog,
  IReducer,
  ITypeStore,
  ReducerType,
  toHex,
} from '@xlnt/gnarly-core'
import flatten = require('arr-flatten')

const makeReducer = (
  key: string = 'events',
  typeStore: ITypeStore,
) => (
  config: { [_: string]: IABIItemInput[] } = {},
): IReducer => {
  const addrs = Object.keys(config)

  // add the abis to the global registry
  for (const addr of addrs) {
    addABI(addr, config[addr])
  }

  const makeActions = (state: object, emit: EmitOperationFn) => ({
    emit: (log: ILog) => {
      emit(appendTo('events', {
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
      typeStore,
    },
    state: {},
    reduce: async (
      state: object,
      block: Block,
      { because, emit },
    ): Promise<void> => {
      const actions = makeActions(state, emit)
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
