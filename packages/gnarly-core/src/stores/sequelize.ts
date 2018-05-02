import Sequelize = require('sequelize')
const { Op } = Sequelize

import {
  IPersistInterface,
  ITransaction,
} from '../Ourbit'

const toInterface = (model) => ({
  id: model.get('id'),
  patches: model.get('patches'),
  inversePatches: model.get('inversePatches'),
})

async function* batch (model, query = {}, batchSize = 1000, mapper = (t) => t) {
  const count = await model.count(query)

  if (count === 0) {
    return false
  }

  const pages = Math.max(Math.round(count / batchSize), 1)
  let page = 1

  console.log('pages;', pages)

  while (page <= pages) {
    const params = {
      ...query,
      offset: (page - 1) * batchSize,
      limit: batchSize,
    }

    const gots = await model.findAll(params)
    yield gots.map(mapper)
    page = page + 1
  }
}

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

  // fetch all transactions from txId to end until there are no more
  // hmm, should probably use an auto-incrementing id to preserve insert order...
  public getAllTransactionsTo = async function (toTxId: null | string):
    Promise<any> {
    const initial = await this.Transaction.findOne({
      where: { id: { [Op.eq]: toTxId } },
    })
    if (!initial) {
      throw new Error(`Could not find txId ${toTxId}`)
    }

    const initialCreatedAt = initial.get('createdAt')
    const query = {
      where: { createdAt: { [Op.lte]: initialCreatedAt } },
      order: [['createdAt', 'ASC']],
    }

    return batch(this.Transaction, query, 1000, toInterface)
  }

  public deleteTransaction = async (tx: ITransaction)  => {
    return this.Transaction.destroy({
      where: { id: { [Op.eq]: tx.id } },
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
