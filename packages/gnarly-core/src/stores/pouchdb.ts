/* tslint:disable max-classes-per-file */

import PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-upsert'))
PouchDB.plugin(require('pouchdb-find'))

// import KSUID = require('ksuid')
import { identity } from 'lodash'

import { IJSONBlock } from '../models/Block'
import {
  ITransaction,
} from '../ourbit/types'
import { IPersistInterface } from '../stores'
import { forEach, toBN, uuid } from '../utils'

// https://pouchdb.com/api.html#batch_fetch
async function* batch (
  db: PouchDB.Database,
  query: object = {},
  batchSize = 1000,
  mapper: (v: any) => any = identity,
) {
  let totalRows = 1 // should be 0 at first, but we want to trigger the first iteration
  let lastId

  while (totalRows > 0) {
    const opts = {
      ...query,
      startkey: lastId,
      skip: 1,
      limit: batchSize,
      include_docs: true,
    }

    const res = await db.allDocs(opts)
    const gots = mapper(res.rows)
    yield gots

    totalRows = gots.total_rows
    if (totalRows === 0) { break }
    lastId = res.rows[res.rows.length - 1].id
  }
}

// all databases  have --gnarly prefix so we can delete them and not destroy any user data
// that might be sitting around
const GNARLY_DB_PREFIX = '--gnarly'

const sortByHexProp = (prop: string) => (a, b) => toBN(a[prop]).sub(toBN(b[prop])).toNumber()
// const sortById = (a, b) => KSUID.parse(a._id).compare(KSUID.parse(b._id))
const toJSONBlock = (block) => block as IJSONBlock
const toTransaction = (tx) => tx as ITransaction
const nonVolatile = (t) => !t.volatile

const destroyDb = async (db: PouchDB.Database) => {
  await db.destroy()
}

const deleteWithQuery = async (db: PouchDB.Database, selector: object) => {
  const res = await db.find({ selector })
  await db.bulkDocs(res.docs.map((d) => ({ ...d, _deleted: true })))
}

const deleteById = async (db: PouchDB.Database, id: string) => {
  await db.remove(await db.get(id))
}

const reducerDb = (e: string): PouchDB.Database => new PouchDB(`${e}/${GNARLY_DB_PREFIX}-reducers`)
const historicalBlocksDb = (e: string) => async (key: string): Promise<PouchDB.Database> =>
  new PouchDB(`${e}/${GNARLY_DB_PREFIX}-historicalblocks-${key}`)
const transactionsDb = (e: string) => async (key: string): Promise<PouchDB.Database> =>
  new PouchDB(`${e}/${GNARLY_DB_PREFIX}-transactions-${key}`)

class DyanmicDict<T> {
  private cache: { [_: string]: T } = {}

  constructor (
    private generator: (key: string) => Promise<T>,
    private resetFn: (thing: T) => Promise<void> = identity,
    private resetOnFirstInitialization: boolean = false,
  ) {
  }

  public get = async (key: string) => {
    if (this.cache[key]) { return this.cache[key] }

    // basically, we don't know the keys of existing dbs until they've been used at runtime
    // so when we want to setdown the store we actually just hold onto that idea
    // and then, when the database is actually created, we nuke the old one and then create the new one
    if (this.resetOnFirstInitialization) {
      await this.resetFn(await this.generator(key))
    }

    this.cache[key] = await this.generator(key)
    return this.cache[key]
  }

  public invalidate = async (key: string) => {
    if (this.cache[key]) {
      await this.resetFn(this.cache[key])
      this.cache[key] = undefined
    }
  }

  public flush = async () => {
    await forEach(Object.keys(this.cache), (k) => this.invalidate(k))
  }
}

export default class PouchDBPersistInterface implements IPersistInterface {
  private reducers: PouchDB.Database
  private historicalBlocks: DyanmicDict<PouchDB.Database>
  private transactions: DyanmicDict<PouchDB.Database>
  private didSetDown: boolean = false

  constructor (
    private dbEndpoint: string,
  ) {
  }

  // reducer CRUD
  public saveReducer = async (reducerKey: string): Promise<any> => {
    await this.reducers.putIfNotExists({ _id: reducerKey })
  }

  public deleteReducer = async (reducerKey: string): Promise<any> => {
    await deleteById(this.reducers, reducerKey)
  }

  // blockstream CRUD
  public getHistoricalBlocks = async (reducerKey: string): Promise<IJSONBlock[]> => {
    const db = await this.historicalBlocks.get(reducerKey)
    const res = await db.allDocs({ include_docs: true, descending: true })

    const blocks = res.rows
      .map((r) => r.doc)
      .map(toJSONBlock)

    blocks.sort(sortByHexProp('number')) // @TODO might be able to replace with ksuid allDocs

    return blocks
  }

  public saveHistoricalBlock = async (reducerKey: string, blockRetention: number, block: IJSONBlock): Promise<any> => {
    const db = await this.historicalBlocks.get(reducerKey)
    await db.put({
      _id: uuid(),
      hash: block.hash,
      parentHash: block.parentHash,
      number: block.number,
      // ^ manually filter properties we care about from block
    })

    // god, this is the worst hack ever, but I'm tired of dealing with pouchdb's weird schema
    const allBlocks = await this.getHistoricalBlocks(reducerKey)
    if (allBlocks.length > blockRetention) {
      // delete the blocks from [0, length - blockRetention)
      // so for a length of 102 and retention of 100, delete the range [0, 2)
      const blocksToDelete = allBlocks.slice(0, -1 * blockRetention)
      // ^ all blocks before blockRetention
      await db.bulkDocs(blocksToDelete.map((r) => ({ ...r, _deleted: true })))
    }
  }

  public deleteHistoricalBlock = async (reducerKey: string, blockHash: string): Promise<any> => {
    await deleteWithQuery(await this.historicalBlocks.get(reducerKey), { hash: { $eq: blockHash } })
  }

  public deleteHistoricalBlocks = async (reducerKey: string): Promise<any> => {
    await this.historicalBlocks.invalidate(reducerKey)
  }

  // transaction CRUD
  public getAllTransactionsTo = async (reducerKey: string, toTxId: null | string): Promise<any> => {
    const db = await this.transactions.get(reducerKey)

    return batch(db, { endkey: toTxId }, 1000, (rows) =>
      rows
        .map((r) => r.doc)
        .map(toTransaction)
        .map((tx: ITransaction) => ({
          ...tx,
          patches: tx.patches.map((p) => ({
            ...p,
            operations: p.operations.filter(nonVolatile),
          })),
        })),
        // ^ in memory filter against volatile operations
    )
  }

  public getLatestTransaction = async (reducerKey: string): Promise<ITransaction> => {
    // in pouch, our ksuids aren't sorting tot he specificity we want
    // so pull the last ~10 and then sort by blocknumber
    const db = await this.transactions.get(reducerKey)
    const res = await db.allDocs({
      include_docs: true,
      limit: 10,
      descending: true,
    })

    if (!res.rows.length) {
      throw new Error(`Could not get latest transaction in ${reducerKey}`)
    }

    const txs = res.rows.map((r) => r.doc).map(toTransaction)
    txs.sort(sortByHexProp('blockNumber'))

    return txs[txs.length - 1]
  }

  public deleteTransaction = async (reducerKey: string, txId: string): Promise<any> => {
    await deleteById(await this.transactions.get(reducerKey), txId)
  }

  public saveTransaction = async (reducerKey: string, tx: ITransaction): Promise<any> => {
    const db = await this.transactions.get(reducerKey)
    await db.put({
      _id: tx.id,
      ...tx,
    })
  }

  public getTransaction = async (reducerKey: string, txId: string): Promise<ITransaction> => {
    const db = await this.transactions.get(reducerKey)
    const res = await db.get(txId)
    return toTransaction(res)
  }

  public getTransactionByBlockHash = async (reducerKey: string, blockHash: string): Promise<ITransaction> => {
    const db = await this.transactions.get(reducerKey)
    const res = await db.find({
      selector: { blockHash: { $eq: blockHash } },
    })

    if (!res.docs.length) {
      throw new Error(`Cound not find transaction in ${reducerKey} by blockHash ${blockHash}`)
    }

    return toTransaction(res.docs[0])
  }

  // setup & setdown
  public setup = async (): Promise<any> => {
    try {
      this.reducers = reducerDb(this.dbEndpoint)
      this.historicalBlocks = new DyanmicDict(historicalBlocksDb(this.dbEndpoint), destroyDb, this.didSetDown)
      this.transactions = new DyanmicDict(transactionsDb(this.dbEndpoint), destroyDb, this.didSetDown)
    } catch (error) {
      throw new Error(`Instantiating PouchDBs failed: ${error.stack}`)
    }
  }

  public setdown = async (): Promise<any> => {
    this.didSetDown = true

    // @TODO - replace this dynamic dict setdown situation by iterating over all of the reducers
    await reducerDb(this.dbEndpoint).destroy()

    if (this.historicalBlocks) {
      await this.historicalBlocks.flush()
    }

    if (this.transactions) {
      await this.transactions.flush()
    }
  }
}
