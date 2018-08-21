import { exec } from 'child_process'
import Sequelize = require('sequelize')

import PouchDBPersistInterface from '../../src/stores/pouchdb'
import SequelizePersistInterface from '../../src/stores/sequelize'
import { timeout } from '../../src/utils'

import shouldBehaveLikePersistInterface from './PersistInterface.behavior'

describe('All Stores', function () {
  const pouchDBServerStore = new PouchDBPersistInterface('http://127.0.0.1:5985')
  const defaultPouchStore = new PouchDBPersistInterface('http://127.0.0.1:5984')

  const sequelize = new Sequelize('postgres://postgres@127.0.0.1:5432/travis_ci_test', {
    logging: false,
  })
  const sequelizeStore = new SequelizePersistInterface(Sequelize, sequelize)

  describe('PouchDB Store (pouchdb-server)', function () {
    this.timeout(12000)
    before(async function () {
      this.child = exec('pouchdb-server -p 5985 -m')
      this.child.on('error', (error) => {
        console.log(`child error:\n${error}`)
      })
      await timeout(1000)
    })

    after(async function () {
      await this.child.kill()
    })

    shouldBehaveLikePersistInterface(pouchDBServerStore)
  })

  describe('PouchDB Store (default)', function () {
    this.timeout(12000)
    // assumes pouchdb-server/CouchDB available on default port
    shouldBehaveLikePersistInterface(defaultPouchStore)
  })

  describe('Sequelize Store (Postgres)', function () {
    this.timeout(2000)
    // assumes postgres is running locally on default port
    shouldBehaveLikePersistInterface(sequelizeStore)
  })
})
