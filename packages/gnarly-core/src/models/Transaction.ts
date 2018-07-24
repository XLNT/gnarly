import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:Transaction')

import BN = require('bn.js')
import abi = require('web3-eth-abi')

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

    const registeredAbi = globalState.getABI(this.to)
    if (!registeredAbi) { return }
    // ^ we do not know about this contract, so we can't try to parse it

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

    // get abi item
    const paramAbiItem = registeredAbi.find((item) => item.signature === this.signature)
    if (!paramAbiItem) { return }
    // ^ using incorrect abi

    const parameterTypes = paramAbiItem.inputs.filter((item) => ({
      type: item.type,
      name: item.name,
    }))

    const paramData = this.input.replace(paramAbiItem.shortId, '0x')

    let args = {}
    try {
      args = abi.decodeParameters(parameterTypes, paramData)
    } catch (error) {
      // decodeTransaction failed for some reason (null address?)
      debug(
        `Could not parse transaction:
          %O
        `,
        error.stack,
      )
      return
    }

    this.args = args
  }
}
