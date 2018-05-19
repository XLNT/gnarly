/**
 * A global state, modelled after
 * https://github.com/mobxjs/mobx/blob/master/src/core/globalstate.ts
 */

// @TODO(shrugs) - add memoize back and use redis or something
// import { memoize } from 'async-decorators'
import IABIItem, { IABIItemInput } from './models/ABIItem'
import Log from './models/Log'
import NodeApi from './models/NodeApi'
import { enhanceAbiItem } from './utils'

type ABIItemSet = IABIItem[]

export class GnarlyGlobals {
  // @TODO(shrugs) - do we need to move this to a contract artifact?
  public abis: { [s: string]: ABIItemSet } = {}
  public api: NodeApi

  public currentReason: string
  public currentMeta: any

  public getLogs = async (options) => {
    const logs = await this.api.getLogs(options)
    return logs.map((l) => new Log(null, l))
  }

  public setApi = (api: NodeApi) => {
    this.api = api
  }

  public addABI = (address: string, abi: IABIItemInput[]) => {
    this.abis[address.toLowerCase()] = (this.abis[address.toLowerCase()] || [])
      .concat(abi.map(enhanceAbiItem))
  }

  public getABI = (address: string): ABIItemSet => this.abis[address.toLowerCase()]

  public getMethod = (address: string, methodId: string): IABIItem => {
    // replace with O(1) precomputed lookup
    return (this.abis[address.toLowerCase()] || [])
      .find((ai) => ai.shortId === methodId)
  }

  public because = (reason: string, meta: any, fn: () => void) => {
    this.currentReason = reason
    this.currentMeta = meta

    fn()

    this.currentReason = null
    this.currentMeta = null
  }
}

export let globalState: GnarlyGlobals = new GnarlyGlobals()
