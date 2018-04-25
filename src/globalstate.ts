/**
 * A global state, modelled after
 * https://github.com/mobxjs/mobx/blob/master/src/core/globalstate.ts
 */

import IABIItem, { IABIItemInput } from './models/ABIItem'
import NodeApi from './models/NodeApi'
import Reducer from './reducer'
import { enhanceAbiItem } from './utils'

type ABIItemSet = IABIItem[]

export class GnarlyGlobals {
  // @TODO(shrugs) - do we need to move this to a contract artifact?
  public abis: { [s: string]: ABIItemSet } = {}
  public api: NodeApi

  public currentReason: string
  public currentMeta: any

  public setApi = (api: NodeApi) => {
    this.api = api
  }

  public addABI = (address: string, abi: IABIItemInput[]) => {
    this.abis[address.toLowerCase()] = abi.map(enhanceAbiItem)
  }

  public getABI = (address: string): ABIItemSet => this.abis[address.toLowerCase()]
}

export let globalState: GnarlyGlobals = new GnarlyGlobals()
