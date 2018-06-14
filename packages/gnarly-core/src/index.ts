
import './asynciterator-polyfill'

import { globalState } from './globalstate'

export {
  IPatch,
  ITransaction,
} from './ourbit/types'

export { default as Block } from './models/Block'
export { default as Transaction } from './models/Transaction'
export { default as ExternalTransaction } from './models/ExternalTransaction'
export { default as InternalTransaction } from './models/InternalTransaction'
export { default as Log } from './models/Log'
export { default as ABIITem, IABIItemInput } from './models/ABIItem'

export {
  default,
} from './Gnarly'

export * from './utils'
export * from './reducer'
export * from './stores'
export * from './typeStore'
export * from './ingestion'

export const addABI = globalState.addABI.bind(globalState)
export const because = globalState.because.bind(globalState)
export const getLogs = globalState.getLogs.bind(globalState)
export const operation = globalState.operation.bind(globalState)
export const emit = globalState.emit.bind(globalState)
