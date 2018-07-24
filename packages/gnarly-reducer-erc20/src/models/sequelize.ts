import { makeSequelizeModels as makeGnarlyModels } from '@xlnt/gnarly-core'

const sequelizeModels = (Sequelize: any, sequelize: any) => {
  const { DataTypes } = Sequelize
  const { Patch } = makeGnarlyModels(Sequelize, sequelize)

  const ERC20Balances = sequelize.define(
    'erc20_balances',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      darAddress: { type: DataTypes.STRING },
      owner: { type: DataTypes.STRING },
      balance: { type: DataTypes.STRING },
    },
    {
      indexes: [
        // composite unique constraint on darAddress x owner
        { unique: true, fields: ['darAddress', 'owner'] },
        // fast lookups of balances by darAddress
        { fields: ['darAddress'] },
        // fast lookups by owner across dars
        { fields: ['owner'] },
      ],
    },
  )

  ERC20Balances.belongsTo(Patch)

  return {
    ERC20Balances,
  }
}

export default sequelizeModels
