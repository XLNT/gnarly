import '../../src/asynciterator-polyfill'

import _ = require('lodash')
import {
  IPatch,
  IPersistInterface,
  ITransaction,
} from '../../src/Ourbit'

export const mockPatch: IPatch = {
  id: 'mockPatch',
  operations: [{
    op: 'add',
    path: '/kittyTracker/ownerOf/0x12345',
    value: '0x0987',
    volatile: false,
  }],
}

export const mockTransaction: ITransaction = {
  id: 'mockTransaction',
  blockHash: '0xblock',
  patches: [mockPatch],
}

class MockPersistInterface implements IPersistInterface {

  private transactions: ITransaction[] = []

  public setup = async (reset: boolean = false) => {
    // nothing to be done
  }

  public async getAllTransactionsTo (toTxId: null | string): Promise<any> {
    return async function* () {
      yield this.transactions
    }
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
    return mockTransaction
  }
}

export default MockPersistInterface
