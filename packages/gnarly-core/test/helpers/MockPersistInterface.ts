import {
  IPatch,
  IPersistInterface,
  ITransaction,
} from '../../src/Ourbit'

export const mockPatch: IPatch = {
  id: 'mockPatch',
  op: {
    op: 'add',
    path: '/kittyTracker/ownerOf/0x12345',
    value: '0x0987',
  },
  oldValue: undefined,
}

export const mockTransaction: ITransaction = {
  id: 'mockTransaction',
  patches: [mockPatch],
}

class MockPersistInterface implements IPersistInterface {

  public setup = async (reset: boolean = false) => {
    // nothing to be done
  }

  public async getAllTransactionsTo (toTxId: null | string):
    Promise<any> {
      return async function* () {
        yield [mockTransaction]
      }
  }

  public async getTransactions (fromTxId: null | string): Promise<ITransaction[]> {
    return [mockTransaction]
  }

  public async getLatestTransaction (): Promise<ITransaction> {
    return mockTransaction
  }

  public async deleteTransaction (tx: ITransaction) {
    return null
  }

  public async saveTransaction (tx: ITransaction) {
    return null
  }

  public async getTransaction (txId: string): Promise<ITransaction> {
    return mockTransaction
  }
}

export default MockPersistInterface
