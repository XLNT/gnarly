import { globalState } from './globalstate'

export {
  IPatch,
  IPersistInterface,
  ITransaction,
  ITypeStore,
} from './Ourbit'

export { default as Block } from './models/Block'
export { default as Transaction } from './models/Transaction'
export { default as Log } from './models/Log'

export * from './stores'

export {
  default,
  OnBlockHandler,
} from './Gnarly'

export {
  forEach,
  addressesEqual,
} from './utils'

export const addABI = globalState.addABI.bind(globalState)

export const because = (reason, meta, fn) => {
  // console.log(`[because] [start] ${reason}`)
  globalState.currentReason = reason
  globalState.currentMeta = meta

  fn()

  globalState.currentReason = null
  globalState.currentMeta = null
  // console.log(`[because] [end] ${reason}`)
}
