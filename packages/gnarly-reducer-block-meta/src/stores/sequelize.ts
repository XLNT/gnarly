import sequelizeModels from '../models/sequelize'

import {
  SequelizeTypeStorer,
} from '@xlnt/gnarly-core'

const makeSequelizeTypeStore = (
  Sequelize: any,
  sequelize: any,
  key?: string,
) => {
  const {
    Block,
  } = sequelizeModels(Sequelize, sequelize, key)

  // the type store
  return {
    __setup: async (reset: boolean = false) => {
      await Block.sync({ force: reset })
    },
    store: SequelizeTypeStorer(Sequelize, {
      blocks: Block,
    }),
  }
}

export default makeSequelizeTypeStore
