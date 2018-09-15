
import {
  makeSequelizeModels as makeGnarlyModels,
} from '@xlnt/gnarly-core'

const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
) => {
  const { DataTypes } = Sequelize
  const { Patch } = makeGnarlyModels(Sequelize, sequelize)

  const Events = sequelize.define('events', {
    // gnarly-required columns
    uuid: { type: DataTypes.STRING, primaryKey: true },

    address: { type: DataTypes.STRING },
    event: { type: DataTypes.STRING },
    eventName: { type: DataTypes.STRING },
    signature: { type: DataTypes.STRING },
    args: { type: DataTypes.JSONB },
  }, {
    indexes: [
      { fields: ['address'] },
      { fields: ['event'] },
    ],
  })

  Events.Patch = Events.belongsTo(Patch, { constraints: false })

  return {
    Events,
  }
}

export default sequelizeModels
