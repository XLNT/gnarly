import { ITransaction } from '../ourbit/types'

export interface IPersistInterface {
  // transaction storage
  // @TODO - how do you get typescript to stop complaining about AsyncIterator symbols?
  getAllTransactionsTo (toTxId: null | string): Promise<any>
  getLatestTransaction (): Promise<ITransaction>
  deleteTransaction (tx: ITransaction): Promise<any>
  saveTransaction (tx: ITransaction): Promise<any>
  getTransaction (txId: string): Promise<ITransaction>

  // event log CRUD actions

  // setup
  setup (): Promise<any>
  setdown (): Promise<any>
}

export {
  default as SequelizePersistInterface,
  makeSequelizeModels,
} from './sequelize'
