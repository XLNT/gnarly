import { find, findIndex } from 'lodash'
import { IJSONBlock } from '../../src/models/Block'
import {
  ITransaction,
} from '../../src/ourbit'
import { IStore } from '../../src/stores'

async function* iter (
  res: any[] = [],
) {
  for (const thing of res) {
    yield thing
  }
}

export default class MockStore implements IStore {

  private reducers: any[] = []
  private transactions: ITransaction[] = []
  private historicalBlocks: { [_: string]: IJSONBlock[] } = {}

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

  public getHistoricalBlocks = async (reducerKey: string): Promise<IJSONBlock[]> => {
    return (this.historicalBlocks[reducerKey] || [])
  }

  public saveHistoricalBlock = async (
    reducerKey: string,
    blockRetention: number,
    block: IJSONBlock,
  ): Promise<any> => {
    if (!this.historicalBlocks[reducerKey]) {
      this.historicalBlocks[reducerKey] = []
    }

    this.historicalBlocks[reducerKey].push(block)
  }

  public deleteHistoricalBlock = async (reducerKey: string, blockHash: string): Promise<any> => {
    this.historicalBlocks[reducerKey] = this.historicalBlocks[reducerKey].filter((b) =>
      b.hash !== blockHash,
    )
  }

  public deleteHistoricalBlocks = async (reducerKey: string): Promise<any> => {
    this.historicalBlocks[reducerKey] = []
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

  public async deleteTransaction (reducerKey: string, txId: string) {
    const i = findIndex(this.transactions, (t) => t.id === txId)
    this.transactions.splice(i, 1)
    return
  }

  public async saveTransaction (reducerKey: string, tx: ITransaction) {
    this.transactions.push(tx)
    return
  }

  public async getTransaction (reducerKey: string, txId: string): Promise<ITransaction> {
    return find(this.transactions, (t) => t.id === txId)
  }

  public async getTransactionByBlockHash (reducerKey: string, blockHash: string): Promise<ITransaction> {
    return find(this.transactions, (t) => t.blockHash === blockHash)
  }
}
