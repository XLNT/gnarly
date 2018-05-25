import '../../src/asynciterator-polyfill'

import _ = require('lodash')
import {
  IPatch,
  IPersistInterface,
  ITransaction,
} from '../../src/Ourbit'

async function* iter (
  res: any[] = [],
) {
  for (const thing of res) {
    yield thing
  }
}

class MockPersistInterface implements IPersistInterface {

  private transactions: ITransaction[] = []

  public setup = async (reset: boolean = false) => {
    // nothing to be done
    this.transactions = []
  }

  public async getAllTransactionsTo (toTxId: null | string): Promise<any> {
    return iter([this.transactions])
  }

  public async getTransactions (fromTxId: null | string): Promise<ITransaction[]> {
    return this.transactions
  }

  public async getLatestTransaction (): Promise<ITransaction> {
    return this.transactions[this.transactions.length - 1]
  }

  public async deleteTransaction (tx: ITransaction) {
    const i = _.findIndex(this.transactions, (t) => t.id === tx.id)
    this.transactions.splice(i, 1)
    return
  }

  public async saveTransaction (tx: ITransaction) {
    this.transactions.push(tx)
    return
  }

  public async getTransaction (txId: string): Promise<ITransaction> {
    return _.find(this.transactions, (t) => t.id === txId)
  }
}

export default MockPersistInterface
