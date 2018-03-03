// import 'isomorphic-fetch'

// import {
//     action,
//     autorun,
//     computed,
//     observable,
//     transaction,
//     useStrict,
// } from 'mobx'
// useStrict(true)

// import AppState from './AppState'
// import Blockstream from './Blockstream'

// const state = new AppState()

// autorun(() => {
//   console.log(state.numTransactions, state.weight.toString())
// })

// const web3Endpoint = 'http://localhost:8545'

// const blockstream = Blockstream(web3Endpoint)

// blockstream.on('block:add', (blockData) => {
//   state.handleNewBlockData(blockData)
// })

// blockstream.on('block:remove', (blockData) => {
//   state.invalidateBlockData(blockData)
// })

// setTimeout(() => {
//   blockstream.close()
// }, 60000)

/*

we need to store a list of patches to the declared state
and start from nothing, apply all patches and arrive at the correct steady state
in our system, each entry is linked to an action that produced it

*/

/**
 *
 * blockchain-part:
 * stateReference = types.model("Store")...
 *
 * storeInterface = {
 *   persistPatch,
 *   patchesFrom(tx_id),
 * }
 *
 * typeStoreInterface: {
 *   kittyTracker: {
 *     ownerOf: (tx_id, { op, key, value }) => {
 *       switch (op) {
 *         add/replace:
 *           UPSERT WHERE kitty_id = key SET owner_id = value, tx_id = tx_id
 *         remove:
 *           DELETE FROM WHERE kitty_id = key, tx_id = tx_id
 *       }
 *     }
 *   }
 * }
 *
 *
 *
 * gnarly.persistStateWithStore(stateReference, typeStoreInterface)
 *
 * stateReference.onPatch((patch) => {
 *   // patch.path = /storeKey/keyKey/key
 *   // storeKey = kittyTracker
 *   // keyKey = ownerOf
 *   // key = key
 *
 *   typeStoreInterface[storeKey][keyKey](tx_id, {
 *     ...patch,
 *     key,
 *   })
 * })
 *
 *
 *
 * urbit:
 * a transaction is a discrete set of events that produce patches to the state
 *   but should be treated as a single unit that can be reverted.
 *   One transaction can produce multiple events that can produce multiple patches.
 * tx => [event]
 * event => [patch]
 * tx_id = uuid for each transaction(), by which patches are indexed
 *
 * when using gnarly with blockchains, tx_id === block_id (fork_id, block_num)
 *
 *  - handle resuming itself from either null, or some tx_id
 *    - pulling patches from that tx_id and apply them over provided initialState
 *    - urbit = new Urbit(stateReference, storeInterface)
 *    - urbit.applyPatchesFrom(tx_id = null)
 *  - accept transaction stream, calls the provided reducer over those events
 *    - processTransaction(tx_id, (stateReference) => {
 *        because(reason, () => {
 *          // do mobx manipulation
 *        })
 *      })
 *  - handle persisting patches as they're produced (solid-state-interpreter-ing)
 *    - mobx.onPatch(storeInterface, (patch) => { storeInterface.persistPatch(tx_id) })
 *  - handle rollbacks
 *    - urbit.rollback(tx_id)
 *      (mobx.applyPatch(stateReference, reversePatchesByTxId(tx_id)))
 */

import { transaction } from 'mobx'
import { getSnapshot, onPatch, onSnapshot, types } from 'mobx-state-tree'
// import Urbitesq from './Urbitesq'

import {
  BlockchainPart,
  Urbit,
  persistStateWithStore,
} from './'

interface IStoreInterface {
  persistPatch: (txId: string, patch: any) => Promise<any>
  patchesFrom: (txId: string) => Promise<any>
}

class SqlStoreInterface implements IStoreInterface {
  public connectionString

  constructor (connectionString: string) {
    this.connectionString = connectionString
  }

  public async persistPatch (txId: string, patch: any) {
    //
  }

  public async patchesFrom (txId: string) {
    //
  }
}

const sql = {}

const MyTypeStore = {
  kittyTracker: {
    ownerOf: (txId: string, { op, key, value }) => {
      switch (op) {
        case 'add':
          // await sql.insert()
        case 'replace':
          // await sql.update()
        case 'remove':
          // await sql.delete()
        default:
          throw new Error('wut')
      }
    },
  },
}

const because = (reason, meta, fn) => {
  // start group with reason + meta
  transaction(() => {
    fn()
  })
}

// developer land
const CRYPTO_KITTIES = '0x0'

const reasons = {
  BlockProduced: 'BLOCK_PRODUCED',
  KittyTransfer: 'KITTY_TRANSFER',
  DonationCreated: 'DONATION_CREATED',
}

const KittyTracker = types
  .model('KittyTracker', {
    ownerOf: types.optional(types.map(types.string), {}),
  })
  .actions((self) => ({
    transfer (tokenId, to) {
      self.ownerOf.set(tokenId, to)
    },
  }))

const Store = types.model('Store', {
  kittyTracker: types.optional(KittyTracker, {}),
})

const stateReference = Store.create({
  kittyTracker: KittyTracker.create(),
})

const storeInterface = new SqlStoreInterface('postgres://')
const nodeEndpoint = ''

const onBlock = (block) => {
  block.transactions.forEach((tx) => {
    if (tx.to === CRYPTO_KITTIES) {
      tx.events.forEach((event) => {
        if (event.name === 'Transfer') {
          because(reasons.KittyTransfer, {}, () => {
            stateReference.kittyTracker.transfer(event[0], event[1])
          })
        }
      })
    }
  })
}

const urbit = new Urbit(stateReference, storeInterface)
const blockstreamer = new BlockchainPart(nodeEndpoint, urbit, onBlock)

persistStateWithStore(stateReference, MyTypeStore)

const gnarly = new Gnarly({
  stateReference,
  storeInterface,
  nodeEndpoint,
  typeStore: MyTypeStore,
  onBlock,
})

gnarly.shaka()

// replace for loop with onBlockProduced
// for (let i = 1; i < 11; i++) {
//   const block = { number: i  }

//   because(reasons.BlockProduced, { number: block.number }, () => {
//     store.gasPrice.addGasPriceAverage(1000 * block.number)
//   })

//   because(reasons.KittyTransfer, { id: '0xkitty', from: '0x1', to: '0x2' }, () => {
//     store.kitties.transfer('0xkitty', '0x2')
//   })

//   because(reasons.DonationCreated, { from: '0x1', amount: 45 }, () => {
//     store.donations.addDonation('0x1', 45)
//     store.donations.addDonation('0x1', 65)
//   })
// }
