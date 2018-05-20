
const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
  Transaction: any, // the Gnarly Transaction Sequelize model
  key: string = '',
) => {
  const { DataTypes } = Sequelize
  const tableName = key ? `${key}_blocks` : 'blocks'
  // @TODO - allow users to decide if they want to coerce these large numbers
  // into actual number types
  const Block = sequelize.define(tableName, {
    hash: { type: DataTypes.STRING, primaryKey: true },
    number: { type: DataTypes.STRING },
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
  })

  if (Transaction) {
    Block.belongsTo(Transaction)
  }

  return {
    Block,
  }
}

export default sequelizeModels
