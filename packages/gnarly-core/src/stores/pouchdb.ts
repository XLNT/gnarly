import PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-upsert'))
PouchDB.plugin(require('pouchdb-find'))

import { IJSONBlock } from '../models/Block'
import {
  ITransaction,
} from '../ourbit/types'
import { IPersistInterface } from '../stores'
import { toBN } from '../utils'

const sortByHexProp = (prop: string) => (a, b) => toBN(a[prop]).sub(toBN(b[prop])).toNumber()
const toJSONBlock = (block) => block as IJSONBlock

const deleteWithQuery = async (db, selector) => {
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

const reducerDb = (e) => `${e}/gnarly-reducers`
const historicalBlocksDb = (e) => `${e}/gnarly-historical-blocks`
const transactionsDb = (e) => `${e}/gnarly-transactions`

export default class PouchDBPersistInterface implements IPersistInterface {

  private reducers: PouchDB.Database
  private historicalBlocks: PouchDB.Database
  private transactions: PouchDB.Database

  constructor (
    dbEndpoint: string,
  ) {
    try {
      this.reducers = new PouchDB(reducerDb(dbEndpoint))
      this.historicalBlocks = new PouchDB(historicalBlocksDb(dbEndpoint))
      this.transactions = new PouchDB(transactionsDb(dbEndpoint))
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
    const res = await this.historicalBlocks.find({
      selector: {
        reducerKey: { $eq: reducerKey },
      },
    })

    return res.docs.map(toJSONBlock).sort(sortByHexProp('number'))
  }

  public saveHistoricalBlock = async (reducerKey: string, blockRetention: number, block: IJSONBlock): Promise<any> => {
    await this.historicalBlocks.putIfNotExists({
      _id: block.hash,
      ...block,
      reducerKey,
    })

    // @TODO (shrugs) - delete blocks after blockRetention for this reducer
  }

  public deleteHistoricalBlock = async (reducerKey: string, blockHash: string): Promise<any> => {
    await deleteWithQuery(this.historicalBlocks, {
      _id: { $eq: blockHash },
      reducerKey: { $eq: reducerKey },
    })
  }

  public deleteHistoricalBlocks = async (reducerKey: string): Promise<any> => {
    await deleteWithQuery(this.historicalBlocks, {
      reducerKey: { $eq: reducerKey },
    })
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
    // implicitely create database if not exists
    await this.reducers.info()
    await this.historicalBlocks.info()
    await this.transactions.info()

    // index historical blocks on reducerKeys
    this.historicalBlocks.createIndex({
      index: { fields: ['reducerKey'] },
    })
  }

  public setdown = async (): Promise<any> => {
    await this.reducers.destroy()
    await this.historicalBlocks.destroy()
    await this.transactions.destroy()
  }
}
