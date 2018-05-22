
const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
) => {
  const { DataTypes } = Sequelize
  const Events = sequelize.define('events', {
    uuid: { type: DataTypes.STRING },
    txId: { type: DataTypes.STRING },
    patchId: { type: DataTypes.STRING },

    address: { type: DataTypes.STRING },
    event: { type: DataTypes.STRING },
    eventName: { type: DataTypes.STRING },
    signature: { type: DataTypes.STRING },
    args: { type: DataTypes.JSONB },
  }, {
    indexes: [
      { fields: ['uuid'] },
      { fields: ['address'] },
      { fields: ['event'] },
      { fields: ['txId'] },
    ],
  })

  return {
    Events,
  }
}

export default sequelizeModels
