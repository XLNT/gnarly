import {
  IPatch,
} from './Ourbit'

export default async (ourbit, typeStore) => {
  const pendingPromises = []

  const handler = (txId: string, patch: IPatch) => {
    const promiseToStore = typeStore[patch.reducerKey][patch.domainKey](txId, patch)
    pendingPromises.push(promiseToStore)
  }

  ourbit.on('patch', handler)
  return async (): Promise<any> => {
    ourbit.removeListener('patch', handler)
    return Promise.all(pendingPromises)
    // ^ is there a better way to do this?
  }
}
