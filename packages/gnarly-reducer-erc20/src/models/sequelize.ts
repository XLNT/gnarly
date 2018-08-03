import { makeSequelizeModels as makeGnarlyModels } from '@xlnt/gnarly-core'

const sequelizeModels = (Sequelize: any, sequelize: any) => {
  const { DataTypes } = Sequelize
  const { Patch } = makeGnarlyModels(Sequelize, sequelize)

  const ERC20Balances = sequelize.define(
    'erc20_balances',
    {
      id: { type: DataTypes.STRING, primaryKey: true },
      tokenAddress: { type: DataTypes.STRING },
      owner: { type: DataTypes.STRING },
      balance: { type: DataTypes.DECIMAL(76, 0) },
      balanceStr: { type: DataTypes.STRING },
      // ^ keep a copy of the balance in string
    },
    {
      indexes: [
        // composite unique constraint on tokenAddress x owner
        { unique: true, fields: ['tokenAddress', 'owner'] },
        // fast lookups of balances by tokenAddress
        { fields: ['tokenAddress'] },
        // fast lookups by owner across tokens
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
