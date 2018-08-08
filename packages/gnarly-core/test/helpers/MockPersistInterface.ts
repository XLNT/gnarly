import '../../src/asynciterator-polyfill'

import _ = require('lodash')
import {
  ITransaction,
} from '../../src/Ourbit'
import { IPersistInterface } from '../../src/stores'

async function* iter (
  res: any[] = [],
) {
  for (const thing of res) {
    yield thing
  }
}

class MockPersistInterface implements IPersistInterface {

  private reducers: any[] = []
  private transactions: ITransaction[] = []

  public setup = async (reset: boolean = false) => {
    // nothing to be done
    this.transactions = []
  }

  public setdown = async () => {
    //
  }

  public saveReducer = (reducerKey: string): Promise<any> => {
    this.reducers.push(reducerKey)
    return
  }

  public deleteReducer = (reducerKey: string): Promise<any> => {
    this.reducers = this.reducers.filter((r) => r !== reducerKey)
    return
  }

  public async getAllTransactionsTo (reducerKey: string, toTxId: null | string): Promise<any> {
    return iter([this.transactions])
  }

  public async getTransactions (reducerKey: string, fromTxId: null | string): Promise<ITransaction[]> {
    return this.transactions
  }

  public async getLatestTransaction (reducerKey: string): Promise<ITransaction> {
    return this.transactions[this.transactions.length - 1]
  }

  public async deleteTransaction (reducerKey: string, tx: ITransaction) {
    const i = _.findIndex(this.transactions, (t) => t.id === tx.id)
    this.transactions.splice(i, 1)
    return
  }

  public async saveTransaction (reducerKey: string, tx: ITransaction) {
    this.transactions.push(tx)
    return
  }

  public async getTransaction (reducerKey: string, txId: string): Promise<ITransaction> {
    return _.find(this.transactions, (t) => t.id === txId)
  }

  public async getTransactionByBlockHash (reducerKey: string, blockHash: string): Promise<ITransaction> {
    return _.find(this.transactions, (t) => t.blockHash === blockHash)
  }
}

export default MockPersistInterface
