import Sequelize from 'sequelize'

import {
  IPersistInterface,
  ITransaction,
} from '../Ourbit'

const toInterface = (model) => ({
  id: model.get('id'),
  patches: model.get('patches'),
  inversePatches: model.get('inversePatches'),
})

class SequelizePersistInterface implements IPersistInterface {
  private connectionString
  private sequelize

  private Transaction

  constructor (connectionString: string) {
    this.connectionString = connectionString
    this.sequelize = new Sequelize(this.connectionString, {
      logging: false,
      pool: {
        max: 5,
        min: 0,
        idle: 20000,
        acquire: 20000,
      },
    })

    this.Transaction = this.sequelize.define('transaction', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
      },
      patches: Sequelize.JSONB,
      inversePatches: Sequelize.JSONB,
    })
  }

  public setup = async (reset: boolean = false) => {
    await this.Transaction.sync({ force: reset })
  }

  public getLatestTransaction = async () => {
    const tx = await this.Transaction.findOne({ order: [['createdAt', 'DESC']] })
    return toInterface(tx)
  }

  // @TODO(shrugs) - should this be fromTxId or toTxId?
  public getTransactions = async (fromTxId: null | string)  => {
    const txs = await this.Transaction.findAll({
      order: [[ 'createdAt', 'ASC']],
    })
    return txs.map(toInterface)
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
    const tx = await this.Transaction.findById(txId)
    return toInterface(tx)
  }
}

export default SequelizePersistInterface
