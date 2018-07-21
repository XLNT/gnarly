import { ITransaction } from '../ourbit/types'

export interface IPersistInterface {

  saveReducer (reducerKey: string): Promise<any>
  deleteReducer (reducerKey: string): Promise<any>
  // transaction storage
  // @TODO - how do you get typescript to stop complaining about AsyncIterator symbols?
  getAllTransactionsTo (reducerKey: string, toTxId: null | string): Promise<any>
  getLatestTransaction (reducerKey: string): Promise<ITransaction>
  deleteTransaction (reducerKey: string, tx: ITransaction): Promise<any>
  saveTransaction (reducerKey: string, tx: ITransaction): Promise<any>
  getTransaction (reducerKey: string, txId: string): Promise<ITransaction>
  getTransactionByBlockHash (reducerKey: string, blockHash: string): Promise<ITransaction>

  // event log CRUD actions

  // setup
  setup (): Promise<any>
  setdown (): Promise<any>
}

export {
  default as SequelizePersistInterface,
  makeSequelizeModels,
} from './sequelize'
