const MapTypeStore = (
  model: any, // Sequelize
  keyValueKeys: {
    key: string,
    value: string,
  } = { key: 'key', value: 'value' },
) => async (txId: string, patch: any) => {
  switch (patch.op) {
    case 'add': {
      console.log(`${keyValueKeys.value} [add ${patch.key}]`, patch)
      await model.create({
        txId,
        patchId: patch.id,
        [keyValueKeys.key]: patch.key,
        [keyValueKeys.value]: patch.value,
      })
      break
    }
    case 'replace': {
      console.log(`${keyValueKeys.value} [replace ${patch.key}]`, patch)
      await model.update({
        txId,
        patchId: patch.id,
        [keyValueKeys.key]: patch.key,
        [keyValueKeys.value]: patch.value,
      }, {
        where: { [keyValueKeys.key]: patch.key },
      })
      break
    }
    case 'remove': {
      console.log(`${keyValueKeys.value} [remove ${patch.key}]`, patch)
      await model.destroy({
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
