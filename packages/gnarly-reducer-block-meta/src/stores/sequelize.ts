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
    __setup: async () => {
      await Block.sync()
    },
    __setdown: async () => {
      await Block.drop({ cascade: true })
    },
    store: SequelizeTypeStorer(Sequelize, {
      blocks: Block,
    }),
  }
}

export default makeSequelizeTypeStore
