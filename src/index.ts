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

export {
  default,
  OnBlockHandler,
} from './Gnarly'

export * from './utils'
export * from './reducer'
export * from './stores'

export const addABI = globalState.addABI.bind(globalState)

export const because = (reason: string, meta: any, fn: () => void) => {
  globalState.currentReason = reason
  globalState.currentMeta = meta

  fn()

  globalState.currentReason = null
  globalState.currentMeta = null
}
