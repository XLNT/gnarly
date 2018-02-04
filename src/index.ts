import 'isomorphic-fetch'

import {
    action,
    autorun,
    computed,
    observable,
    transaction,
    useStrict,
} from 'mobx'
useStrict(true)

import AppState from './AppState'
import Blockstream from './Blockstream'

const state = new AppState()

autorun(() => {
  console.log(state.numTransactions, state.weight.toString())
})

const web3Endpoint = 'http://localhost:8545'

const blockstream = Blockstream(web3Endpoint)

blockstream.on('block:add', (blockData) => {
  state.handleNewBlockData(blockData)
})

blockstream.on('block:remove', (blockData) => {
  state.invalidateBlockData(blockData)
})

setTimeout(() => {
  blockstream.close()
}, 60000)
