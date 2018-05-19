
const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
  key: string,
) => {
  const { DataTypes } = Sequelize
  const Events = sequelize.define(`${key}_events`, {
    // id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    txId: { type: DataTypes.STRING },
    patchId: { type: DataTypes.STRING },

    address: { type: DataTypes.STRING },
    event: { type: DataTypes.STRING },
    eventName: { type: DataTypes.STRING },
    signature: { type: DataTypes.STRING },
    args: { type: DataTypes.JSONB },
  }, {
    indexes: [
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
