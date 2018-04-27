# 🤙 Gnarly

> Gnarly’s reduces blockchain events into a steady state with confidence.
>
> And that’s fuckin’ gnarly.

-----> [Read the Medium post for more details](https://medium.com/xlnt-art/solving-severe-asynchronicity-with-gnarly-51f5310e5543) <-----

## Developer Install / Usage

clone this repo

```
npm install
npm run test
npm run watch-ts
```

To use it in a project, implement the following components and then put them all together:

- `stateReference` — the state that you want to manage, as a mobx-state-tree
- `storeInterface` — implement the interface to store gnarly's internal state
- `ITypeStore` — implement the interface to store the actual info you want (add, update, delete)
- `onBlock` — implement the state reduction function that gnarly uses to process events

Note that if you `npm link` gnarly, because mobx requires a single mobx instance to function, you need to symlink your project's `mobx` and `mobx-state-tree` to gnarly's with something like

```bash
npm link gnarly
ln -sF ./gnarly/node_modules/mobx `pwd`/node_modules/mobx
ln -sF ./gnarly/node_modules/mobx-state-tree `pwd`/node_modules/mobx-state-tree
```

which enforces that they reference the same module.

Now let's write some typescript. See a full example of a kitty tracker in [./examples/kitty/index.ts](./examples/kitty/index.ts)

```js
// first, let's register the cryptokitties transfer abi with gnarly
const CRYPTO_KITTIES = '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d'
addABI(CRYPTO_KITTIES, [{
    anonymous: false,
    inputs: [
      { indexed: false, name: 'from', type: 'address' },
      { indexed: false, name: 'to', type: 'address' },
      { indexed: false, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  }],
)
```

```js
// next let's configure the kitty table in our store
// this is just normal sequelize stuff
const Kitty = sequelize.define('kitty', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  txId: { type: Sequelize.STRING },
  patchId: { type: Sequelize.STRING },

  kittyId: { type: Sequelize.STRING },
  owner: { type: Sequelize.STRING },
}, {
    indexes: [
      { fields: ['kittyId'] },
      { fields: ['owner'] },
      { fields: ['txId'] },
    ],
  })
```

```js
// the TypeStore tells gnarly how to update the store for each type
// must be (relatively) atomic and not swallow errors
const MyTypeStore = {
  kittyTracker: {
    ownerOf: async (txId: string, patch: any) => {
      switch (patch.op) {
        case 'add': {
          await Kitty.create({
            txId,
            patchId: patch.id,
            kittyId: patch.key,
            owner: patch.value,
          })
          break
        }
        case 'replace': {
          await Kitty.update({
            txId,
            patchId: patch.id,
            kittyId: patch.key,
            owner: patch.value,
          }, {
              where: { kittyId: patch.key },
            },
          )
          break
        }
        case 'remove': {
          await Kitty.destroy({
            where: { kittyId: patch.key },
          })
          break
        }
        default: {
          throw new Error('wut')
        }
      }
    },
  },
}
```

```js
// build the mobx-state-tree store
// this describes a state that contains a map of owner address to token id
// along with a single action, `setOwner` that sets a key/value
const KittyTracker = types
  .model('KittyTracker', {
    ownerOf: types.optional(types.map(types.string), {}),
  })
  .actions((self) => ({
    setOwner (tokenId, to) {
      self.ownerOf.set(tokenId, to)
    },
  }))

const Store = types.model('Store', {
  // ... any other stores you want in here ...
  kittyTracker: types.optional(KittyTracker, {}),
})

// now create a reference to an instance of this state
const stateReference = Store.create({
  kittyTracker: KittyTracker.create(),
})

```

```js
// implement the state reduction function
// simply modify your state in reaction to a new block
// gnarly handles everything else behind the scenes!
const onBlock = async (block) => {
  // 1. for ever transaction in this block (async)...
  forEach(block.transactions, async (tx) => {
    // 2. if it's a direct transaction to the cryptokitties contract...
    if (addressesEqual(tx.to, CRYPTO_KITTIES)) {
      // 3. Load the rest of the transaction info (logs, internal transactions)
      // NOTE: to get the full tx, you need a parity archive+tracing node
      await tx.getReceipt()

      // 4. for each log (sync)
      tx.logs.forEach((log) => {
        // 5. if the event is Transfer
        if (log.event === 'Transfer') {
          const { to, tokenId } = log.args

          // 6. Give gnarly some context for this change using `because()`
          // (this context is (will be) provided to the ui as part of the event log)
          because('KITTY_TRANSFER', {}, () => {
            // 7. finally, update the state using your action
            stateReference.kittyTracker.setOwner(tokenId, to)
          })
        }
      })
    }
  })
}
```

```js
// finally, put it all together
const gnarly = new Gnarly(
  stateReference,
  storeInterface,
  nodeEndpoint,
  MyTypeStore,
  onBlock,
)

const main = async () => {
  // reset gnarly's internal state
  await storeInterface.setup()
  // reset our app's derived state
  await Counter.sync({ force: true })
  await Kitty.sync({ force: true })
  // start gnarly
  await gnarly.shaka()
}
```

See a full example of a kitty tracker in [./examples/kitty/index.ts](./examples/kitty/index.ts)

## TODO

We'd love your help with any of this stuff

- [x] literally just testing the code we've written at all, manually
  - [x] does it work
- [x] automated testing with mocha/chai/etc
  - [ ] ourbit unit tests, with a stubbed store
  - [ ] ourbit integration tests against sqlite (optional)
  - [ ] blockstream with stubbed getters calls ourbit correctly
  - [ ] test that persistStateWithStore works corectly
  - [ ] test utils file
  - [ ] gnarly itself works (integration test)
- [ ] update README with example code
- [ ] any sort of overall architecture improvements
- [ ] replace block reconciliation polling with a web3 filter
- [ ] replace `getTransactions` with a generator that can page through results
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

- how did we get an 'add' patch for a key that hadn't been set yet?
  - yeah, we're definitely getting 'add' patches for things when they don't actually exist yet
  - is it because we're dropping connections to postgres?
  - see if the latest changes fixed that
- why doesn't an optional array inside of an optional map work?
  - if setting default, do we get patches for that?
  - if not, why the hell not?
