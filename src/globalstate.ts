/**
 * A global state, modelled after
 * https://github.com/mobxjs/mobx/blob/master/src/core/globalstate.ts
 */

import IABIItem from './models/ABIItem'
import NodeApi from './models/NodeApi'

type ABISet = IABIItem[]

export class GnarlyGlobals {
  // @TODO(shrugs) - do we need to move this to a contract artifact?
  public abis: { [s: string]: ABISet }
  public api: NodeApi

  public currentReason: string
  public currentMeta: any

  public setApi = (api: NodeApi) => {
    this.api = api
  }
}

export let globalState: GnarlyGlobals = new GnarlyGlobals()
