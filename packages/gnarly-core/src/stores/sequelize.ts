import identity = require('lodash.identity')

const raw = true

import {
  IPatch,
  IPersistInterface,
  ITransaction,
} from '../Ourbit'

async function* batch (
  model: any,
  query = {},
  batchSize = 1000,
  mapper: (v: any) => any = identity,
) {
  const count = await model.count(query)

  if (count === 0) {
    return false
  }

  const pages = Math.max(Math.round(count / batchSize), 1)
  let page = 1

  while (page <= pages) {
    const params = {
      ...query,
      offset: (page - 1) * batchSize,
      limit: batchSize,
    }

    // @TODO(shrugs) - replace with { raw: true }
    const gots = await model.findAll(params)
    yield gots.map(mapper)
    page = page + 1
  }
}

class SequelizePersistInterface implements IPersistInterface {
  private Transaction
  private Patch

  constructor (
    private Sequelize: any,
    private sequelize: any,
  ) {
    this.Transaction = this.sequelize.define('transaction', {
      id: { type: Sequelize.DataTypes.STRING, primaryKey: true },
      blockHash: { type: Sequelize.DataTypes.STRING },
    }, {
      indexes: [
        { fields: ['blockHash'], unique: true },
      ],
    })

    this.Patch = this.sequelize.define('patch', {
      id: { type: Sequelize.DataTypes.STRING, primaryKey: true },
      op: { type: Sequelize.DataTypes.JSONB },
      oldValue: { type: Sequelize.DataTypes.JSONB },
    })

    this.Transaction.Patches = this.Transaction.hasMany(this.Patch)
    this.Patch.Transaction = this.Patch.belongsTo(this.Transaction)
  }

  public setup = async (reset: boolean = false) => {
    await this.Transaction.sync({ force: reset })
    await this.Patch.sync({ force: reset })
  }

  public getLatestTransaction = async () => {
    return this.Transaction.findOne({ order: [['createdAt', 'DESC']], raw })
  }

  // fetch all transactions from txId to end until there are no more
  // hmm, should probably use an auto-incrementing id to preserve insert order...
  public getAllTransactionsTo = async function (toTxId: null | string):
    Promise<any> {
    const initial = await this.getTransaction(toTxId)
    if (!initial) {
      throw new Error(`Could not find txId ${toTxId}`)
    }

    const query = {
      where: { createdAt: { [this.Sequelize.Op.lte]: initial.createdAt } },
      order: [['createdAt', 'ASC']],
      raw,
    }

    return batch(this.Transaction, query, 1000)
  }

  public deleteTransaction = async (tx: ITransaction)  => {
    return this.Transaction.destroy({
      where: { id: { [this.Sequelize.Op.eq]: tx.id } },
    })
  }

  public saveTransaction = async (tx: ITransaction)  => {
    return this.Transaction.create(tx, {
      include: [this.Transaction.Patches],
    })
  }

  public getTransaction = async (txId: string)  => {
    return this.Transaction.findOne({
      where: { id: { [this.Sequelize.Op.eq]: txId } },
      raw,
    })
  }
}

export default SequelizePersistInterface
