/* tslint:disable max-classes-per-file */

import PouchDB = require('pouchdb')
require('pouchdb-all-dbs')(PouchDB)
PouchDB.plugin(require('pouchdb-upsert'))
PouchDB.plugin(require('pouchdb-find'))

import { IJSONBlock } from '../models/Block'
import {
  ITransaction,
} from '../ourbit/types'
import { IPersistInterface } from '../stores'
import { forEach, toBN } from '../utils'

// all databases should have --gnarly prefix so we can delete them and not destroy any user data
// that might be sitting around
const GNARLY_DB_PREFIX = '--gnarly'

const sortByHexProp = (prop: string) => (a, b) => toBN(a[prop]).sub(toBN(b[prop])).toNumber()
const toJSONBlock = (block) => block as IJSONBlock

const deleteWithQuery = async (db: PouchDB.Database, selector: object) => {
  const res = await db.find({ selector })
  await db.bulkDocs(res.docs.map((d) => ({ ...d, _deleted: true })))
}

// // https://pouchdb.com/api.html#batch_fetch
// const prefix = (p: string) => ({
//   startkey: `${p}`,
//   endkey: `${p}\ufff0`,
// })

// jsonpatch path is _id?
// pouchdb relies heavily on unique identifiers that operate as the primary index
// so our use of `mid` in postgres will complement this nicely

const reducerDb = (e: string) => `${e}/${GNARLY_DB_PREFIX}-reducers`
const historicalBlocksDb = (e: string) => (key: string): PouchDB.Database =>
  new PouchDB(`${e}/${GNARLY_DB_PREFIX}-${key}-historical-blocks`)
const transactionsDb = (e: string) => (key: string): PouchDB.Database =>
  new PouchDB(`${e}/${GNARLY_DB_PREFIX}-${key}-transactions`)

class DyanmicDict<T> {
  private cache: { [_: string]: T } = {}

  constructor (
    private dbGenerator: (key: string) => T,
  ) {
  }

  public get = (key: string) => {
    if (this.cache[key]) { return this.cache[key] }

    this.cache[key] = this.dbGenerator(key)
    return this.cache[key]
  }
}

export default class PouchDBPersistInterface implements IPersistInterface {
  private reducers: PouchDB.Database
  private historicalBlocks: DyanmicDict<PouchDB.Database>
  private transactions: DyanmicDict<PouchDB.Database>

  constructor (
    dbEndpoint: string,
  ) {
    try {
      this.reducers = new PouchDB(reducerDb(dbEndpoint))
      this.historicalBlocks = new DyanmicDict(historicalBlocksDb(dbEndpoint))
      this.transactions = new DyanmicDict(transactionsDb(dbEndpoint))
    } catch (error) {
      throw new Error(`Instantiating PouchDBs failed: ${error.stack}`)
    }
  }

  // reducer CRUD
  public saveReducer = async (reducerKey: string): Promise<any> => {
    await this.reducers.putIfNotExists({ _id: reducerKey })
  }
  public deleteReducer = async (reducerKey: string): Promise<any> => {
    await this.reducers.remove(await this.reducers.get(reducerKey))
  }

  // blockstream CRUD
  public getHistoricalBlocks = async (reducerKey: string): Promise<IJSONBlock[]> => {
    const res = await this.historicalBlocks.get(reducerKey).allDocs()
    return res.rows
      .map((r) => r.doc)
      .map(toJSONBlock)
      .sort(sortByHexProp('number'))
  }

  public saveHistoricalBlock = async (reducerKey: string, blockRetention: number, block: IJSONBlock): Promise<any> => {
    await this.historicalBlocks
      .get(reducerKey)
      .putIfNotExists({
        _id: block.hash,
        ...block,
    })

    // @TODO (shrugs) - delete blocks after blockRetention for this reducer
  }

  public deleteHistoricalBlock = async (reducerKey: string, blockHash: string): Promise<any> => {
    await deleteWithQuery(this.historicalBlocks.get(reducerKey), {
      _id: { $eq: blockHash },
    })
  }

  public deleteHistoricalBlocks = async (reducerKey: string): Promise<any> => {
    await this.historicalBlocks.get(reducerKey).destroy()
  }

  // transaction CRUD
  public getAllTransactionsTo = async (reducerKey: string, toTxId: null | string): Promise<any> => {
    //
  }
  public getLatestTransaction = async (reducerKey: string): Promise<ITransaction> => {
    //
  }
  public deleteTransaction = async (reducerKey: string, tx: ITransaction): Promise<any> => {
    //
  }
  public saveTransaction = async (reducerKey: string, tx: ITransaction): Promise<any> => {
    //
  }
  public getTransaction = async (reducerKey: string, txId: string): Promise<ITransaction> => {
    //
  }
  public getTransactionByBlockHash = async (reducerKey: string, blockHash: string): Promise<ITransaction> => {
    //
  }

  // setup & setdown
  public setup = async (): Promise<any> => {
    // databases are implicitely created and schemaless, so this fn isn't really going to do anything
  }

  public setdown = async (): Promise<any> => {
    const dbs = await PouchDB.allDbs()
    await forEach(
      dbs.filter((db) => db.startsWith(GNARLY_DB_PREFIX)),
      async (db) => await (new PouchDB(db)).destroy(),
    )
  }
}
