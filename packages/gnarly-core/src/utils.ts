import BN = require('bn.js')
import { Operation } from 'fast-json-patch'
import numberToBN = require('number-to-bn')
import * as uuid from 'uuid'
import web3Utils = require('web3-utils')

import * as pMap from 'p-map'

import IABIItem, { IABIItemInput } from './models/ABIItem'
import {
  IPatch,
  IPathThing,
} from './Ourbit'

export const parsePath = (path: string): IPathThing => {
  const [
    _,
    scope,
    tableName,
    pk,
    indexOrKey,
  ] = path.split('/')
  return {
    scope,
    tableName,
    pk,
    indexOrKey,
  }
}

export const toBN = (v: string | number | BN): BN => numberToBN(v)

export const forEach = async (iterable, mapper, opts = { concurrency: 10 }) => {
  return pMap(iterable, mapper)
}

export const addressesEqual = (left: string, right: string): boolean => {
  return left && right && left.toLowerCase() === right.toLowerCase()
}

const buildEventSignature = (item: IABIItem): string => {
  return web3Utils._jsonInterfaceMethodToString(item)
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

export const timeout = async (ms: number = 1000) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms))

export const invertPatch = (patch: IPatch): IPatch => {
  switch (patch.op.op) {
    case 'add':
      return {
        ...patch,
        op: {
          op: 'remove',
          path: patch.op.path,
        },
      }
    case 'remove':
      return {
        ...patch,
        op: {
          op: 'add',
          path: patch.op.path,
          value: patch.oldValue,
        },
      }
    case 'replace':
      return {
        ...patch,
        op: {
          op: 'replace',
          path: patch.op.path,
          value: patch.oldValue,
        },
      }
  }
  return patch
}

export const patchToOperation = (patch: IPatch): Operation => patch.op as Operation
export const appendTo = (
  key: string,
  domain: string,
  value: any,
) => {
  // forcefully add uuid to value
  value.uuid = uuid.v4()
  // for now, typeStores interpret an add operation without an index
  // as a normal sort of insert
  // so there's actually nothing special to do here
  // @TODO(shrugs) - this is not JSON Patch compliant because we should technically
  // have the index of the insertion as the final path part
  // but that requires a round trip to the database (previously done in-memory)
  // and we don't have the need for that right now
  return {
    op: 'add',
    path: `/${key}/${domain}/${value.uuid}`,
    value,
  }
}
