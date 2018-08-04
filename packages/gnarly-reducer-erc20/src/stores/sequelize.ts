import sequelizeModels from '../models/sequelize'

import {
  SequelizeTypeStorer,
} from '@xlnt/gnarly-core'

const makeSequelizeTypeStore = (
  Sequelize: any,
  sequelize: any,
) => {
  const {
    ERC20Balances,
  } = sequelizeModels(Sequelize, sequelize)

  // the type store
  return {
    __setup: async () => {
      await ERC20Balances.sync()
    },
    __setdown: async () => {
      await ERC20Balances.drop({ cascade: true })
    },
    store: SequelizeTypeStorer(Sequelize, {
      balances: ERC20Balances,
    }),
  }
}

export default makeSequelizeTypeStore
