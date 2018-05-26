import {
  makeSequelizeModels as makeGnarlyModels,
} from '@xlnt/gnarly-core'

const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
  key: string = '',
) => {
  const { DataTypes } = Sequelize
  const { Transaction, Patch } = makeGnarlyModels(Sequelize, sequelize)

  const tableName = key ? `${key}_block` : 'block'
  // @TODO - allow users to decide if they want to coerce these large numbers
  // into actual number types
  const Block = sequelize.define(tableName, {
    uuid: { type: DataTypes.STRING },

    hash: { type: DataTypes.STRING, primaryKey: true },
    number: { type: DataTypes.STRING },
    unsafeNumber: { type: DataTypes.INTEGER },
    // ^ unsafeNumber is unsafe because it's capped by postgres's integer range
    parentHash: { type: DataTypes.STRING },
    nonce: { type: DataTypes.STRING },
    sha3Uncles: { type: DataTypes.STRING },
    logsBloom: { type: DataTypes.TEXT },
    transactionsRoot: { type: DataTypes.STRING },
    stateRoot: { type: DataTypes.STRING },
    miner: { type: DataTypes.STRING },
    difficulty: { type: DataTypes.STRING },
    totalDifficulty: { type: DataTypes.STRING },
    extraData: { type: DataTypes.STRING },
    size: { type: DataTypes.STRING },
    gasLimit: { type: DataTypes.STRING },
    gasUsed: { type: DataTypes.STRING },
    timestamp: { type: DataTypes.DATE },
  }, {
    indexes: [
      { fields: ['uuid'] },
    ],
  })

  // this is a gnarly Transaction which is actually a blockchain Block
  Block.Transaction = Block.belongsTo(Transaction, {
    targetKey: 'blockHash',
  })
  Block.Patch = Block.belongsTo(Patch)
  const TransactionToBlock = Transaction.hasOne(Block)

  return {
    Block,
    TransactionToBlock,
  }
}

export default sequelizeModels
