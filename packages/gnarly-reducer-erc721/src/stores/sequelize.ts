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
    __setup: async (reset: boolean = false) => {
      await ERC721Tokens.sync({ force: reset })
      await ERC721TokenOwners.sync({ force: reset })
    },
    store: SequelizeTypeStorer(Sequelize, {
      tokens: ERC721Tokens,
      owners: ERC721TokenOwners,
    }),
  }
}

export default makeSequelizeTypeStore
