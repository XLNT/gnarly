
import {
  makeSequelizeModels as makeGnarlyModels,
  SequelizeTypeStorer,
} from '@xlnt/gnarly-core'

const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
) => {
  const { DataTypes } = Sequelize
  const { Patch } = makeGnarlyModels(Sequelize, sequelize)

  const Events = sequelize.define('events', {
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

  Events.Patch = Events.belongsTo(Patch)

  return {
    Events,
  }
}

export default sequelizeModels
