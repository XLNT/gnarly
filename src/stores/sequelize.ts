import Sequelize from 'sequelize'

import {
  IPersistInterface,
  ITransaction,
} from '../Ourbit'

class SequelizePersistInterface implements IPersistInterface {
  private connectionString
  private sequelize

  private Transaction

  constructor (connectionString: string) {
    this.connectionString = connectionString
    this.sequelize = new Sequelize(this.connectionString)

    this.Transaction = this.sequelize.define('transaction', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      patches: Sequelize.JSONB,
      inversePatches: Sequelize.JSONB,
    })
  }

  public setup = async () => {
    // @TODO(shrugs) - make this an env var or remove it entirely
    await this.Transaction.sync({ force: true })
  }

  public getLatestTransaction = async () => {
    return this.Transaction.findOne({ order: [['createdAt', 'DESC']] })
  }

  public getTransactions = async (fromTxId: null | string)  => {
    return this.Transaction.findAll()
  }

  public deleteTransaction = async (tx: ITransaction)  => {
    return this.Transaction.destroy({
      where: { id: tx.id },
    })
  }

  public saveTransaction = async (tx: ITransaction)  => {
    return this.Transaction.create(tx)
  }

  public getTransaction = async (txId: string)  => {
    return this.Transaction.findById(txId)
  }
}

export default SequelizePersistInterface
