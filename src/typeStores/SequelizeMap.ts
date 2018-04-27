const MapTypeStore = (
  table: any, // Sequelize
  keyValueKeys: {
    key: string,
    value: string,
  } = { key: 'key', value: 'value' },
) => async (txId: string, patch: any) => {
  switch (patch.op) {
    case 'add': {
      await table.create({
        txId,
        patchId: patch.id,
        [keyValueKeys.key]: patch.key,
        [keyValueKeys.value]: patch.value,
      })
      break
    }
    case 'replace': {
      await table.update({
        txId,
        patchId: patch.id,
        [keyValueKeys.key]: patch.key,
        [keyValueKeys.value]: patch.value,
      }, {
          where: { [keyValueKeys.key]: patch.key },
        },
      )
      break
    }
    case 'remove': {
      await table.destroy({
        where: { [keyValueKeys.key]: patch.key },
      })
      break
    }
    default: {
      throw new Error('wut')
    }
  }
}

export default MapTypeStore
