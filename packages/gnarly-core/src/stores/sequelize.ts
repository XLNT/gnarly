import identity = require('lodash.identity')

const plain = true

import {
  IPatch,
  ITransaction,
} from '../ourbit/types'
import { IPersistInterface } from '../stores'

export const makeSequelizeModels = (
  Sequelize: any,
  sequelize: any,
) => {
  const { DataTypes } = Sequelize
  const Transaction = sequelize.define('transaction', {
    id: { type: DataTypes.STRING, primaryKey: true },
    reducerKey: { type: DataTypes.STRING, primaryKey: true },
    blockHash: { type: DataTypes.STRING },
  }, {
      indexes: [
        { fields: ['blockHash'], unique: true },
      ],
    })

  const Patch = sequelize.define('patch', {
    id: { type: DataTypes.STRING, primaryKey: true },
  })

  const Operation = sequelize.define('operation', {
    path: { type: DataTypes.STRING },
    op: { type: DataTypes.JSONB },
    value: { type: DataTypes.JSONB },
    oldValue: { type: DataTypes.JSONB },
    volatile: { type: DataTypes.BOOLEAN, defaultValue: false },
  })

  const Reason = sequelize.define('reason', {
    key: { type: DataTypes.STRING },
    meta: { type: DataTypes.JSONB },
  }, {
    indexes: [
      { fields: ['key'] },
    ],
  })

  // transaction has many patches
  Transaction.Patches = Transaction.hasMany(Patch)
  // patch belongs to transaction
  Patch.Transaction = Patch.belongsTo(Transaction)
  // a patch has many operations
  Patch.Operations = Patch.hasMany(Operation)
  // an operation belongs to patch
  Operation.Patch = Operation.belongsTo(Patch)
  // a reason belongs to a patch
  Reason.Patch = Reason.belongsTo(Patch)
  // a patch has one reason
  Patch.Reason = Patch.hasOne(Reason)

  return {
    Transaction,
    Patch,
    Reason,
    Operation,
  }
}

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

    const gots = await model.findAll(params)
    yield mapper(gots)
    page = page + 1
  }
}

class SequelizePersistInterface implements IPersistInterface {
  private Transaction
  private Patch
  private Reason
  private Operation

  constructor (
    private Sequelize: any,
    private sequelize: any,
  ) {
    const { DataTypes } = Sequelize

    const {
      Transaction,
      Patch,
      Operation,
      Reason,
    } = makeSequelizeModels(
      Sequelize,
      sequelize,
    )

    this.Transaction = Transaction
    this.Patch = Patch
    this.Operation = Operation
    this.Reason = Reason
  }

  public setup = async () => {
    await this.Transaction.sync()
    await this.Patch.sync()
    await this.Operation.sync()
    await this.Reason.sync()
  }

  public setdown = async () => {
    await this.Reason.drop({ cascade: true })
    await this.Operation.drop({ cascade: true })
    await this.Patch.drop({ cascade: true })
    await this.Transaction.drop({ cascade: true })
  }

  public getLatestTransaction = async (): Promise<ITransaction> => {
    try {
      return (await this.Transaction.findOne({
        order: [['createdAt', 'DESC']],
        rejectOnEmpty: true,
      })).get({ plain })
    } catch (error) {
      throw new Error(`Could not get latest transaction ${error.stack}`)
    }
  }

  // fetch all transactions from txId to end until there are no more
  // hmm, should probably use an auto-incrementing id to preserve insert order...
  public getAllTransactionsTo = async function (toTxId: null | string):
    Promise<any> {
    let initial
    try {
      initial = await this.getPlainTransaction(toTxId)
    } catch (error) {
      throw new Error(`Could not find txId ${toTxId} - ${error.stack}`)
    }

    const query = {
      where: { createdAt: { [this.Sequelize.Op.lte]: initial.createdAt } },
      order: [['createdAt', 'ASC']],
      include: [{
        model: this.Patch,
        include: [{
          model: this.Operation,
          where: { volatile: { [this.Sequelize.Op.eq]: false } },
        }],
      }],
    }

    return batch(this.Transaction, query, 1000, (txs) => txs.map(
      (tx) => tx.get({ plain }),
    ))
  }

  public deleteTransaction = async (tx: ITransaction) => {
    return this.Transaction.destroy({
      where: { id: { [this.Sequelize.Op.eq]: tx.id } },
    })
  }

  public saveTransaction = async (tx: ITransaction) => {
    return this.Transaction.create(tx, {
      include: [{
        association: this.Transaction.Patches,
        include: [
          this.Patch.Reason,
          this.Patch.Operations,
        ],
      }],
    })
  }

  public getTransaction = async (txId: string): Promise<ITransaction> => {
    try {
      return (await this.Transaction.findOne({
        where: { id: { [this.Sequelize.Op.eq]: txId } },
        include: [{
          model: this.Patch,
          required: false,
          include: [{
            model: this.Operation,
            required: false,
          }, {
            model: this.Reason,
            required: false,
          }],
        }],
        rejectOnEmpty: true,
      })).get({ plain })
    } catch (error) {
      throw new Error(`Could not find transaction ${txId} ${error.stack}`)
    }
  }

  private getPlainTransaction = async (txId: string): Promise<ITransaction> => {
    try {
      return (await this.Transaction.findOne({
        where: { id: { [this.Sequelize.Op.eq]: txId } },
        rejectOnEmpty: true,
      })).get({ plain })
    } catch (error) {
      throw new Error(`Could not get transaction ${txId} ${error.stack}`)
    }
  }
}

export default SequelizePersistInterface
