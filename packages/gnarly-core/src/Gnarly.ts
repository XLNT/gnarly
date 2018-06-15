import makeDebug = require('debug')
const debug = makeDebug('gnarly-core')

import { globalState } from './globalstate'

import IIngestApi from './ingestion/IngestApi'
import { IReducer } from './reducer'
import { IPersistInterface } from './stores'

import ReducerRunner, { makeRunner } from './ReducerRunner'

class Gnarly {
  private runners: ReducerRunner[] = []

  constructor (
    ingestApi: IIngestApi,
    store: IPersistInterface,
    private reducers: IReducer[],
  ) {
    globalState.setApi(ingestApi)
    globalState.setStore(store)
    this.runners = this.reducers.map((reducer) => makeRunner(reducer))
  }

  public shaka = async (fromBlockHash: string | null) => {
    debug('Surfs up!')
    this.runners.forEach((runner) => runner.run(fromBlockHash))
  }

  // @TODO(shrugs) - allow adding reducers at runtime
  // public addReducer = async (reducer: IReducer, fromBlockHash: string | null) => {
  //   const runner = makeRunner(reducer)
  //   this.runners.push(runner)
  //   // start running the reducer, asynchronously
  //   runner.run(fromBlockHash)
  // }

  public bailOut = async () => {
    debug('Gracefully decomposing reducers...')
    await Promise.all(this.runners.map((r) => r.stop()))
    debug('Now that was gnarly!')
  }

  public reset = async (shouldReset: boolean = true) => {
    // reset gnarly internal state
    if (shouldReset) {
      await globalState.store.setdown()
    }
    await globalState.store.setup()

    // reset all reducer states
    debug('%s reducer stores: %s...', shouldReset ? 'Resetting' : 'Setting up')

    await Promise.all(this.runners.map((runner) => runner.reset(shouldReset)))
    debug('Done with %s reducers.', shouldReset ? 'resetting' : 'setting up')
  }
}

export default Gnarly
