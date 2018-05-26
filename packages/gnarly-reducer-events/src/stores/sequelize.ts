import sequelizeModels from '../models/sequelize'

import {
  SequelizeTypeStorer,
} from '@xlnt/gnarly-core'

const makeSequelizeTypeStore = (
  Sequelize: any,
  sequelize: any,
) => {
  const {
    Events,
  } = sequelizeModels(Sequelize, sequelize)

  return {
    __setup: async () => {
      await Events.sync()
    },
    __setdown: async () => {
      await Events.drop({ cascade: true })
    },
    store: SequelizeTypeStorer(Sequelize, {
      events: Events,
    }),
  }
}

export default makeSequelizeTypeStore
