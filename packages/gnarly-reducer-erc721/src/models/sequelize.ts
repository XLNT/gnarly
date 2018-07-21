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
    id: { type: DataTypes.STRING, primaryKey: true },
    darAddress: { type: DataTypes.STRING },
    tokenId: { type: DataTypes.STRING },

    // 1:1 properties of token
    owner: { type: DataTypes.STRING },
  }, {
      indexes: [
        // composite unique constraint on darAddress x tokenId
        { unique: true, fields: ['darAddress', 'tokenId'] },
        // fast lookups of tokens by darAddress
        { fields: ['darAddress'] },
        // fast lookups by owner across dars
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
    as: 'Owners',
  })

  ERC721TokenOwners.belongsTo(ERC721Tokens, {
    as: 'Token',
  })

  return {
    ERC721Tokens,
    ERC721TokenOwners,
  }
}

export default sequelizeModels
