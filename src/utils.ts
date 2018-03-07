import {
  IPathThing,
} from './Ourbit'

export const splitPath = (path: string): IPathThing => {
  const [reducerKey, domainKey, key] = path.split('/')
  return { reducerKey, domainKey, key }
}
