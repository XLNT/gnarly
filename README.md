# 🤙 Gnarly

> Gnarly’s reduces blockchain events into a steady state with confidence.
>
> And that’s fuckin’ gnarly.

-----> [Read the Medium post for more details](https://medium.com/xlnt-art/solving-severe-asynchronicity-with-gnarly-51f5310e5543)

## Description

The simple description of gnarly is that it's a stream-processor for atomic events that persists its internal state to disk, following the solid-state-interpreter pattern ala Urbit.

This means it processes blocks (either from the past or in real-time) and can gracefully handle restarts, reorgs, forks, and more.

Gnarly simplifies the process of taking information _from_ a blockchain and putting it somewhere else, usually in a webapp-friendly format like a SQL database or elasticsearch cluster.

## Usage

To use it in a project, implement the following components and then put them all together:

- `stateReference` — the state that you want to manage, as a mobx-state-tree
- `storeInterface` — implement the interface to store gnarly's internal state
- `ITypeStore` — implement the interface to store the actual info you want (add, update, delete)
- `onBlock` — implement the state reduction function that gnarly uses to process events

which enforces that they reference the same module.

Now let's write some typescript. You can place all of this in one file if you'd like.

```js
// first, let's import some stuff and get a connection to a sql database
import { types } from 'mobx-state-tree'
import Sequelize = require('sequelize')

import Gnarly, {
  addABI,
  addressesEqual,
  because,
  Block,
  forEach,
  makeRootTypeStore,
  makeStateReference,
  SequelizePersistInterface,
} from '@xlnt/gnarly-core'

import makeERC721Reducer, {
  makeSequelizeTypeStore as makeERC721TypeStore,
} from '@xlnt/gnarly-reducer-erc721'

const nodeEndpoint = process.env.NODE_ENDPOINT
// ^ http://127.0.0.1:8545 (or wherever your ethereum node is)
const connectionString = process.env.CONNECTION_STRING
// ^ postgres://...

const sequelize = new Sequelize(connectionString, {
  logging: false,
  pool: {
    max: 5,
    min: 0,
    idle: 20000,
    acquire: 20000,
  },
})
```

```js
// now let's use the erc721 reducer (WIP)
//   to construct a reducer and sequelize typestore for cryptokitties
const CRYPTO_KITTIES = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'
const erc721Reducer = makeERC721Reducer(
  'cryptoKitties',
  CRYPTO_KITTIES,
  reasons.KittyTransfer,
)

const typeStore = makeRootTypeStore({
  cryptoKitties: makeERC721TypeStore(
    'cryptoKitties',
    sequelize,
    Sequelize.DataTypes,
  ),
})
```

```js
// now let's make the root state reference
const reducers = [
  erc721Reducer,
]
const stateReference = makeStateReference(reducers)
// and tell gnarly to put its internal state into postgres using our connection
const storeInterface = new SequelizePersistInterface(connectionString)
```

```js
// finally, put it all together
const gnarly = new Gnarly(
  stateReference, // the local state that you modify in the reducer
  storeInterface, // the interface to which gnarly stores internal state
  nodeEndpoint,   // the location of your ethereum node
  typeStore,      // the interface that converts patches to persisted state
  reducers,       // the reducers
)

const main = async () => {
  await gnarly.reset(false)
  // ^ reset the persistent store or not?
  await gnarly.shaka()
  // ^ make the magic happen
}
// ...
```

## Developer Installation / Setup

clone this repo

```
lerna bootstrap
lerna run test
```

## TODO

We'd love your help with any of this stuff

- [x] automated testing with mocha/chai/etc
  - [ ] more ourbit unit tests
  - [ ] ourbit integration tests against sqlite (optional)
  - [ ] blockstream with stubbed getters calls ourbit correctly
  - [ ] test utils file
  - [ ] gnarly integration tests
- [x] update README with example code
- [ ] any sort of overall architecture improvements
- [ ] replace mobx-state-tree with mongodb & oplog
- [ ] replace block reconciliation polling with a web3 filter
- [x] replace `getTransactions` with a generator that can page through results
- [ ] what should the developer-friendly cli/binary look like? config ala redis? opinions wanted!
---

## Features

- "Instant" updates with confidence intervals
    - optimistic UI pattern; apply expected changes immediately but revert to source of truth as soon as it's known
- reduces blockchain events into a steady state
    - optimize client queries and data architecture
    - compatible with the rest of the world of technology
- graceful reorg and incorrect optimistic state handling
- friendly error management
    - developers get reasonable error contexts
    - consumers get _explanations_ about errors
    - allows anyone to know (i) that something occurred and (ii) _why_ it occurred
- supports replay from arbitrary blocks to (i) bootstrap the steady state and (ii) resume after failures
- default output is catered towards a graphql consuming client

## Solving Severe Asynchronicity

“Severe asynchronicity” is the UX experience of using a first-layer blockchain today:

- transactions publish within a reasonable timeframe (ms) but at very low confidence—it’s hard to know if and when they will succeed
- transactions are finalized within an unreasonable timeframe (minutes/hours) but with very high confidence
- Off-chain state is uncertain due to [1], [2], block re-orgs, short-lived forks, uncles, etc,
- Off-chain software isn’t perfect; it can lag behind the blockchain (if waiting for confirmation blocks), fail to replay state updates in the event of reorgs/forks, improperly handle unconfirmed transactions, and much, much more.

## Key Ideas

Gnarly uses the ideas behind redux and MobX to convert imperative blockchain events to declarative, reactive state.


## Technology
Any/all of this can change, but here are the technologies currently used. Note that gnarly should be able to be used in both a browser and server-side environment.

- Typescript
- MobX
- ethereumjs-blockstream


---

- why doesn't an optional array inside of an optional map work?
  - if setting default, do we get patches for that?
  - if not, why the hell not?
