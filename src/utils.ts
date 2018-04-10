import BigNumber from 'bignumber.js'
import * as pMap from 'p-map'

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

export const hexToBigNumber = (hex: string) => new BigNumber(hex)

export const forEach = async (iterable, mapper, opts = { concurrency: 5 }) => {
  return pMap(iterable, mapper)
}
