/**
 * A global state, modelled after
 * https://github.com/mobxjs/mobx/blob/master/src/core/globalstate.ts
 */

// @TODO(shrugs) - add memoize back and use redis or something
// import { memoize } from 'async-decorators'
import IIngestApi from './ingestion/IngestApi'
import IABIItem, { IABIItemInput } from './models/ABIItem'
import Log from './models/Log'
import { IPersistInterface } from './stores'
import { enhanceAbiItem, onlySupportedAbiItems } from './utils'

export type ABIItemSet = IABIItem[]

export class GnarlyGlobals {
  // @TODO(shrugs) - do we need to move this to a contract artifact?
  public abis: { [s: string]: ABIItemSet } = {}
  public api: IIngestApi
  public store: IPersistInterface

  public getLogs = async (options) => {
    const logs = await this.api.getLogs(options)
    return logs.map((l) => new Log(null, l))
  }

  public setApi = (api: IIngestApi) => {
    this.api = api
  }

  public setStore = (store: IPersistInterface) => {
    this.store = store
  }

  // @TODO(shrugs) - replace this with a map indexed by signatures
  public addABI = (address: string, abi: IABIItemInput[]) => {
    this.abis[address.toLowerCase()] = (this.abis[address.toLowerCase()] || [])
      .concat(
        abi
        .filter(onlySupportedAbiItems)
        .map(enhanceAbiItem),
      )
  }

  public getABI = (address: string): ABIItemSet => this.abis[address.toLowerCase()]

  public getMethod = (address: string, methodId: string): IABIItem => {
    // @TODO(shrugs) replace with O(1) precomputed lookup
    return (this.abis[address.toLowerCase()] || [])
      .find((ai) => ai.shortId === methodId)
  }
}

export let globalState: GnarlyGlobals = new GnarlyGlobals()
