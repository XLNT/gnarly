import { exec } from 'child_process'
import Sequelize = require('sequelize')

import { PouchDBStore, SequelizeStore } from '../../src/stores'
import { timeout } from '../../src/utils'

import shouldBehaveAsStore from './Store.behavior'

describe('All Stores', function () {

  describe('PouchDB Store (pouchdb-server)', function () {
    this.timeout(22000)

    before(async function () {
      this.child = exec('pouchdb-server -p 5985 -m')
      this.child.on('error', (error) => {
        console.log(`child error:\n${error}`)
      })
      await timeout(1000)
      this.store = new PouchDBStore('http://127.0.0.1:5985')
    })

    after(async function () {
      await this.child.kill()
    })

    shouldBehaveAsStore()
  })

  // @TODO - couchdb is not api-compatible with pouchdb-server it seems

  describe('Sequelize Store (Postgres)', function () {

    before(async function () {
      // don't forget to `create database travis_ci_test;` on your local postgres!
      const sequelize = new Sequelize('postgres://postgres@127.0.0.1:5432/travis_ci_test', {
        logging: false,
      })
      this.store = new SequelizeStore(Sequelize, sequelize)
    })

    after(async function () {
      // set down
    })

    // assumes postgres is running locally on default port
    shouldBehaveAsStore()
  })
})
