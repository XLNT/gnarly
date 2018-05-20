
const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
  key: string,
) => {
  const { DataTypes } = Sequelize
  // ownerOf table
  const ERC721Tokens = sequelize.define(`${key}_tokens`, {
    txId: { type: DataTypes.STRING },
    patchId: { type: DataTypes.STRING },

    // primary key
    // @TODO - switch to id
    tokenId: { type: DataTypes.STRING, primaryKey: true },

    // 1:1 properties of token
    owner: { type: DataTypes.STRING },
  }, {
      indexes: [
        { fields: ['tokenId'] },
        { fields: ['owner'] },
        { fields: ['txId'] },
      ],
    })

  const ERC721TokenOwners = sequelize.define(`${key}_owners`, {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    txId: { type: DataTypes.STRING },
    patchId: { type: DataTypes.STRING },

    // properties of each owner
    address: { type: DataTypes.STRING },

    // this is a fk table so it needs an order key
    order: { type: DataTypes.INTEGER },
  }, {
    indexes: [
      { fields: ['tokenId'] },
      { fields: ['txId'] },
    ],
  })

  // token has many owners
  ERC721Tokens.hasMany(ERC721TokenOwners, {
    foreignKey: 'tokenId',
    sourceKey: 'tokenId',
    as: 'Owners',
  })

  ERC721TokenOwners.belongsTo(ERC721Tokens, {
    foreignKey: 'tokenId',
    targetKey: 'tokenId',
    as: 'Token',
  })

  return {
    ERC721Tokens,
    ERC721TokenOwners,
  }
}

export default sequelizeModels
