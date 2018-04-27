import BN = require('bn.js')
import { globalState } from '../globalstate'
import { getMethodId } from '../utils'

export default class Transaction {
  public from: string
  public to: string
  public value: BN
  public input: string
  public gasUsed: BN
  public gas: BN

  public method: string
  // transfer
  public methodName: string
  // transfer(address)
  public signature: string
  // 0x1234567890
  public methodId: string
  // 0x12345678
  public args: object = {}

  public parse = () => {
    if (!this.input) { return }
    if (this.input.length < 10) { return }
    // ^ has data, but not enough for a method call

    // parse out method id
    const methodId = getMethodId(this.input)

    // look up abi in global state
    const methodAbi = globalState.getMethod(this.to, methodId)
    if (!methodAbi) { return }

    // we have a method abi, so parse it out
    this.method = methodAbi.name
    this.methodName = methodAbi.fullName
    this.signature = methodAbi.signature
    this.methodId = methodAbi.shortId
    // @TODO(shrugs) - do that
    this.args = {}
  }
}
