import sequelizeModels from '../models/sequelize'

import {
  SequelizeTypeStorer,
} from '@xlnt/gnarly-core'

const makeSequelizeTypeStore = (
  Sequelize: any,
  sequelize: any,
  key: string,
) => {
  const {
    ERC721Tokens,
    ERC721TokenOwners,
  } = sequelizeModels(Sequelize, sequelize, key)

  // the type store
  return {
    __setup: async () => {
      await ERC721Tokens.sync()
      await ERC721TokenOwners.sync()
    },
    __setdown: async () => {
      await ERC721TokenOwners.drop({ cascade: true })
      await ERC721Tokens.drop({ cascade: true })
    },
    store: SequelizeTypeStorer(Sequelize, {
      tokens: ERC721Tokens,
      owners: ERC721TokenOwners,
    }),
  }
}

export default makeSequelizeTypeStore
