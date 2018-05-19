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

  interface IEventTracker {
    events: Array<{
      address: string,
      event: string,
      eventName: string,
      signature: string,
      args: object,
    }>
  }

  const eventTracker: IEventTracker = { events: [] }

  const makeActions = (state: IEventTracker) => ({
    emit: (log) => {
      state.events.push({
        address: log.address,
        event: log.event,
        eventName: log.eventName,
        signature: log.signature,
        args: log.args,
      })
    },
  })

  // return the reducer
  return {
    config: {
      type: ReducerType.TimeVarying,
      key,
    },
    state: eventTracker,
    reduce: async (state: IEventTracker, block: Block): Promise<void> => {
      const actions = makeActions(state)
      const logs = await forEach(addrs, async (addr) => getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: addr,
      }))

      logs.flatten().forEach((log) => {
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
