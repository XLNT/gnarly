import BN = require('bn.js')
import numberToBN = require('number-to-bn')
import web3Utils = require('web3-utils')

import * as pMap from 'p-map'

import IABIItem, { IABIItemInput } from './models/ABIItem'
import {
  IPathThing,
} from './Ourbit'

export const splitPath = (path: string): IPathThing => {
  // Since the mobx patch path gets called with a leading '/',
  // splitting the path('/') returns an array with the first element as
  // an empty string
  const [emptyString, reducerKey, domainKey, key] = path.split('/')
  return { reducerKey, domainKey, key }
}

export const toBN = (v: string | number | BN): BN => numberToBN(v)

export const forEach = async (iterable, mapper, opts = { concurrency: 5 }) => {
  return pMap(iterable, mapper)
}

export const addressesEqual = (left, right) => {
  return left && right && left.toLowerCase() === right.toLowerCase()
}

const buildEventSignature = (item: IABIItem) => {
  return web3Utils._jsonInterfaceMethodToString(item)
}

export const enhanceAbiItem = (item: IABIItemInput): IABIItem => {
  const fullName = web3Utils._jsonInterfaceMethodToString(item)
  const signature = web3Utils.sha3(fullName)

  return {
    ...item,
    fullName,
    signature,
  }
}
