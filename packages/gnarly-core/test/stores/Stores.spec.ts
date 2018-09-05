import { exec } from 'child_process'
import Sequelize = require('sequelize')

import { PouchDBStore, SequelizeStore } from '../../src/stores'
import { timeout } from '../../src/utils'

import Store from './Store.behavior'

describe('All Stores', function () {
  const pouchDBServerStore = new PouchDBStore('http://127.0.0.1:5985')
  // const defaultPouchStore = new PouchDBStore('http://127.0.0.1:5984')

  // don't forget to `create database travis_ci_test;` on your local postgres!
  const sequelize = new Sequelize('postgres://postgres@127.0.0.1:5432/travis_ci_test', {
    logging: false,
  })
  const sequelizeStore = new SequelizeStore(Sequelize, sequelize)

  describe('PouchDB Store (pouchdb-server)', function () {
    this.timeout(22000)
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

    Store(pouchDBServerStore)
  })

  // @TODO - couchdb is not api-compatible with pouchdb-server it seems
  // describe('PouchDB Store (default)', function () {
  //   this.timeout(12000)
  //   // assumes pouchdb-server/CouchDB available on default port
  //   Store(defaultPouchStore)
  // })

  describe('Sequelize Store (Postgres)', function () {
    this.timeout(2000)
    // assumes postgres is running locally on default port
    Store(sequelizeStore)
  })
})
