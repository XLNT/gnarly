import {
  IPatch,
  IPersistInterface,
  ITransaction,
} from '../../Ourbit'

export const mockPatch: IPatch = {
  id: 'mockPatch',
  domainKey: 'ownerOf',
  key: '0x12345',
  op: 'add',
  path: '/kittyTracker/ownerOf/0x12345',
  reducerKey: 'kittyTracker',
  value: '0x0987',
}

export const mockInversePatch: IPatch = {
  id: 'mockPatch',
  domainKey: 'ownerOf',
  key: '0x12345',
  op: 'remove',
  path: '/kittyTracker/ownerOf/0x12345',
  reducerKey: 'kittyTracker',
}

export const mockTransaction: ITransaction = {
  id: 'mockTransaction',
  patches: [mockPatch],
  inversePatches: [mockInversePatch],
}

class MockPersistInterface implements IPersistInterface {

  public async getTransactions (fromTxId: null | string): Promise<ITransaction[]> {
    return Promise.resolve([mockTransaction])
  }

  public async deleteTransaction (tx: ITransaction) {
    return
  }

  public async saveTransaction (tx: ITransaction) {
    return
  }

  public async getTransaction (txId: string): Promise<ITransaction> {
    return Promise.resolve(mockTransaction)
  }
}

export default MockPersistInterface
