import { Operation } from '@xlnt/fast-json-patch'
import BN = require('bn.js')
import KSUID = require('ksuid')
import { flatMap } from 'lodash'
import memoize from 'moize'
import numberToBN = require('number-to-bn')
import pMap = require('p-map')
import web3Utils = require('web3-utils')

import IABIItem, { IABIItemInput } from './models/ABIItem'
import {
  IOperation,
  IPatch,
  IPathThing,
} from './ourbit/types'

const API_CACHE_MAX_AGE = 1000

// shrugs: I feel like using the sync randomness here isn't really a big deal, but we'll see
export const uuid = () => KSUID.randomSync().string

export const cacheApiRequest = (fn) => memoize(fn, {
  isPromise: true,
  maxAge: API_CACHE_MAX_AGE,
})

export const parsePath = (path: string): IPathThing => {
  const [
    emptyString, // ignore this
    tableName,
    pk,
    indexOrKey,
  ] = path.split('/')
  return {
    tableName,
    pk,
    indexOrKey,
  }
}

export const toBN = (v: string | number | BN): BN => numberToBN(v)

export const forEach = async (iterable, mapper, opts = { concurrency: 10 }) =>
  pMap(iterable, mapper, opts)

export const addressesEqual = (left: string, right: string): boolean => {
  return left && right && left.toLowerCase() === right.toLowerCase()
}

const supportedTypes: string[] = ['function', 'event']
export const onlySupportedAbiItems = (item: IABIItemInput): boolean =>
  supportedTypes.includes(item.type)

export const enhanceAbiItem = (item: IABIItemInput): IABIItem => {
  const fullName = web3Utils._jsonInterfaceMethodToString(item)
  const signature = web3Utils.sha3(fullName)
  const shortId = signature.substr(0, 10)

  return {
    ...item,
    fullName,
    signature,
    shortId,
  }
}

// we dont' do anything special here, but it helps add structure
// ¯\_(ツ)_/¯
export const makeRootTypeStore = (typestore: object): object => typestore

export const getMethodId = (input: string) => input.substr(0, 10)
// ^0x12345678

export const toHex = (num: BN) => `0x${num.toString(16)}`

export const timeout = async (ms: number = 0) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms))

export const invertOperation = (operation: IOperation): IOperation => {
  switch (operation.op) {
    case 'add':
      return {
        ...operation,
        op: 'remove',
        oldValue: operation.value,
        value: undefined,
      }
    case 'remove':
      return {
        ...operation,
        op: 'add',
        value: operation.oldValue,
        oldValue: undefined,
      }
    case 'replace':
      return {
        ...operation,
        op: 'replace',
        value: operation.oldValue,
        oldValue: operation.value,
      }
  }

  throw new Error(`Could not invert operation ${JSON.stringify(operation)}`)
}

export const invertPatch = (patch: IPatch): IPatch => ({
  ...patch,
  operations: patch.operations.map(invertOperation).reverse(),
  reason: {
    key: 'ROLLBACK',
    meta: { prevReason: patch.reason },
  },
})

export const operationsOfPatch = (patch: IPatch): IOperation[] =>
  patch.operations
export const operationsOfPatches = (patches: IPatch[]): IOperation[] =>
  flatMap(patches, operationsOfPatch)

export const toOperation = (operation: IOperation): Operation => operation as Operation

export const appendTo = (
  domain: string,
  value: any,
): IOperation => {
  // forcefully add uuid to value
  value.uuid = uuid()
  // for now, typeStores interpret an add operation without an index
  // as a normal sort of insert
  // so there's actually nothing special to do here
  // @TODO(shrugs) - this is not JSON Patch compliant because we should technically
  // have the index of the insertion as the final path part
  // but that requires a round trip to the database (previously done in-memory)
  // and we don't have the need for that right now
  return {
    op: 'add',
    path: `/${domain}/${value.uuid}`,
    value,
    volatile: true,
  }
}
