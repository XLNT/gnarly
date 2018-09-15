import {
  makeSequelizeModels as makeGnarlyModels,
} from '@xlnt/gnarly-core'

const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
) => {
  const { DataTypes } = Sequelize
  const { Patch } = makeGnarlyModels(Sequelize, sequelize)
  // @TODO - allow users to decide if they want to coerce these large numbers
  // into actual number types
  const Block = sequelize.define('block', {
    // gnarly-required columns
    uuid: { type: DataTypes.STRING, primaryKey: true },
    order: { type: DataTypes.INTEGER },

    hash: { type: DataTypes.STRING },
    // ^hash === gnarly#Transaction.blockHash
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
      { fields: ['hash'], unique: true },
    ],
  })

  Block.Patch = Block.belongsTo(Patch, { constraints: false })

  return {
    Block,
  }
}

export default sequelizeModels
