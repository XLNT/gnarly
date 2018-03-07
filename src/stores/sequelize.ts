
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
      patches: Sequelize.JSON,
      inversePatches: Sequelize.JSON,
    })
  }

  public async getTransactions (fromTxId: null | string) {
    return this.Transaction.findAll()
  }

  public async deleteTransaction (tx: ITransaction) {
    return this.Transaction.destroy({
      where: { id: tx.id },
    })
  }

  public async saveTransaction (tx: ITransaction) {
    return this.Transaction.create(tx)
  }

  public async getTransaction (txId: string) {
    return this.Transaction.findById(txId)
  }
}

export default SequelizePersistInterface
