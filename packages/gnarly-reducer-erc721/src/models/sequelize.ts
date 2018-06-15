import {
  makeSequelizeModels as makeGnarlyModels,
} from '@xlnt/gnarly-core'

const sequelizeModels = (
  Sequelize: any,
  sequelize: any,
) => {
  const { DataTypes } = Sequelize
  const { Patch } = makeGnarlyModels(Sequelize, sequelize)
  // ownerOf table
  const ERC721Tokens = sequelize.define('erc721_tokens', {
    darAddress: { type: DataTypes.STRING, primaryKey: true },
    tokenId: { type: DataTypes.STRING, primaryKey: true },

    // 1:1 properties of token
    owner: { type: DataTypes.STRING },
  }, {
      indexes: [
        { fields: ['darAddress'] },
        { fields: ['tokenId'] },
        { fields: ['owner'] },
      ],
    })

  const ERC721TokenOwners = sequelize.define('erc721_owners', {
    uuid: { type: DataTypes.STRING, primaryKey: true },

    // properties of each owner
    address: { type: DataTypes.STRING },

    // this is a fk table so it needs an order key
    order: { type: DataTypes.INTEGER },
  })

  ERC721Tokens.belongsTo(Patch)
  ERC721TokenOwners.belongsTo(Patch)

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
