
const JSONArrayTypeStore = (
  model: any, // Sequelize
  keyValueKeys: {
    key: string,
    value: string,
  } = { key: 'key', value: 'value' },
) => async (txId: string, patch: any) => {
  // in the case of an array, we get `add` patches for new items
  // and replace patches for updating existing items at an index
  // and `remove` for removing an item at an index
  const index = patch.extra.length
    ? parseInt(patch.extra[0], 10)
    : 0
  switch (patch.op) {
    case 'add': {
      switch (typeof patch.value) {
        case 'string':
          // this is a push
          const existing = await model.findOne({
            where: { [keyValueKeys.key]: patch.key },
          })
          const newValue = existing.get(keyValueKeys.value)
          newValue.push(patch.value)
          existing.set(keyValueKeys.value, newValue)
          await existing.save()
          break
        default:
          // else it's an array, which means new thing
          await model.create({
            txId,
            patchId: patch.id,
            [keyValueKeys.key]: patch.key,
            [keyValueKeys.value]: patch.value,
          })
      }
      break
    }
    case 'replace': {
      const existing = await model.findOne({
        where: { [keyValueKeys.key]: patch.key },
      })
      existing.set('patchId', patch.id)
      const newValue = existing.get(keyValueKeys.value)
      newValue[index] = patch.value
      existing.set(keyValueKeys.value, newValue)
      await existing.save()
      break
    }
    case 'remove': {
      const existing = await model.findOne({
        where: { [keyValueKeys.key]: patch.key },
      })
      existing.set('patchId', patch.id)
      const newValue = existing.get(keyValueKeys.value)
      newValue.splice(index, 1)
      existing.set(keyValueKeys.value, newValue)
      await existing.save()
      break
    }
    default: {
      throw new Error('wut')
    }
  }
}

export default JSONArrayTypeStore
