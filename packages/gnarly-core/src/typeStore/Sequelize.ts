import makeDebug = require('debug')
const debug = makeDebug('gnarly-core:store:sequelize')

import isPlainObject = require('lodash.isplainobject')

import { IOperation, IPatch } from '../ourbit/types'
import {
  parsePath,
} from '../utils'

const withOrder = (order, value) => ({
  ...value,
  order: parseInt(order, 10),
})

const getForeignKeys = (model) => Object.keys(model.rawAttributes).filter((k) =>
  !!model.rawAttributes[k].references,
)

/**
 * the persist function accepts a patch and has a side effect of
 * updating the sql database given a schema
 *
 * This needs the Sequelize thing passed in cause literal doesn't work
 * without the dialect configuration or something, it's really dumb
 * https://github.com/sequelize/sequelize/issue1s/9121
 */
const buildTypeStore = (Sequelize, schema) => async (
  patchId: string,
  operation: IOperation,
) => {
  const { Op, literal } = Sequelize

  const {
    op,
    value,
    path,
  } = operation

  const {
    tableName,
    pk,
    indexOrKey,
  } = parsePath(path)

  debug('path: %j', parsePath(path))
  debug('op: %j', operation)
  debug('schema: ', Object.keys(schema))

  const hasIndexOrKey = indexOrKey !== undefined
  // ^ do we have an index OR a key?
  const index = parseInt(indexOrKey, 10)
  // ^ Number | NaN, doesn't throw
  const isIndex = !Number.isNaN(index)
  // ^ whether or not this is a numeric index or a string key

  const withMeta = (v) => ({...v, patchId})
  const model = schema[tableName]
  const {
    primaryKeyAttribute,
  } = model
  // const foreignKeys = getForeignKeys(model)
  // const hasForeignKey = foreignKeys.length > 0

  const selector = primaryKeyAttribute

  // if there's a foreign key, it's probably belongs_to
  // so use that as the window
  // otherwise we can use the primary key selector
  const window = { [selector]: { [Op.eq]: pk } }
  // ^ default window in the database

  const addSingle = async (properties) => {
    await model.create(withMeta(properties))
  }

  debug(
    `
      tableName: %s
      pk: %s
      indexOrKey: %s
      op: %s
      value: %j
      selector: %s
    `,
    tableName,
    pk,
    indexOrKey,
    op,
    (op as any).value,
    selector,
  )
  switch (op) {
    case 'add': {
      if (isPlainObject(value)) {
        // we're inserting a row
        if (isIndex) {
          // if there's an index on this, we're actually inserting at a specific order
          // which means we need to increase the order of everything after this index
          await model.update({
            order: literal('"order" + 1'),
          }, {
            where: {
              ...window,
              order: { [Op.gte]: index },
            },
          })
          // then insert the new item at that index
          await addSingle(withOrder(indexOrKey, value))
        } else {
          await addSingle(value)
        }
      } else if (Array.isArray(value)) {
        if (isIndex) {
          // if there's an array of values at an index or key here,
          //   we're trying to do some weird nested situation
          //   and we don't support that (yet?)
          throw new Error(`
            Received index or key "${indexOrKey}"
            and value ${JSON.stringify(value)}
            should be arrays.
          `)
        }

        // if we get an array of values in an add operation, we're just inserting
        //   a bunch of rows to initialize the view
        //   and those rows have some order
        //    (because things with primary keys will arrive as multiple different patches)
        for (const [i, v] of value.entries()) {
          await addSingle(withOrder(i, v))
        }
      } else {
        // we're updating a discreet property but don't know the key
        // so this is probably an issue with the user's store typing
        throw new Error(`
          Attempted to add discreet value ${JSON.stringify(value)}
          at primaryKey ${pk} in table ${model.tableName},
          which only supports properties.
        `)
      }
      break
    }
    case 'replace': {
      if (!hasIndexOrKey || isIndex) {
        throw new Error(`
          No 'indexOrKey' in op ${operation}
          for value "${JSON.stringify(value)}" or the value was numeric.
          We expect a discreet string key here.
        `)
      }

      // updating a value which should definitely be a discreet value
      model.update(withMeta({
        [indexOrKey]: value,
      }), {
        where: window,
      })
      break
    }
    case 'remove': {
      await model.destroy({
        where: window,
        limit: 1,
        // if we got an indexOrKey in a removal operation, we need to splice
        //   by offsetting the window
        offset: isIndex ? index : 0,
      })

      if (isIndex) {
        // we removed an item, so subtract an order index from everything greater
        await model.update({
          order: literal('"order" - 1'),
        }, {
          where: {
            ...window,
            order: { [Op.gt]: indexOrKey },
          },
        })
      }
      break
    }
    default:
      throw new Error('wut')
  }
}

export default buildTypeStore
