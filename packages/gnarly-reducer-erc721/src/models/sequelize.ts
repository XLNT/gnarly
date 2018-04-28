
const sequelizeModels = (
  key: string,
  sequelize: any,
  DataTypes: any,
) => {
  // ownerOf table
  const ERC721OwnerOf = sequelize.define(`${key}_ownerOf`, {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    txId: { type: DataTypes.STRING },
    patchId: { type: DataTypes.STRING },

    tokenId: { type: DataTypes.STRING },
    owner: { type: DataTypes.STRING },
  }, {
      indexes: [
        { fields: ['tokenId'] },
        { fields: ['owner'] },
        { fields: ['txId'] },
      ],
    })

  // ownershipHistory table
  const ERC721OwnershipHistory = sequelize.define(`${key}_ownershipHistory`, {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    txId: { type: DataTypes.STRING },
    patchId: { type: DataTypes.STRING },

    tokenId: { type: DataTypes.STRING },
    owners: { type: DataTypes.JSONB },
  }, {
      indexes: [
        { fields: ['tokenId'] },
        { fields: ['txId'] },
      ],
    })

  return {
    ERC721OwnerOf,
    ERC721OwnershipHistory,
  }
}

export default sequelizeModels
