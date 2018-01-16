# Gnarly

> Gnarly’s reduces blockchain events into a steady state with confidence.
>
> And that’s fuckin’ gnarly.

## Features

- "Instant" updates with confidence intervals
    - optimistic UI pattern; apply expected changes immedately but revert to source of truth as soon as it's known
- reduces blockchain events into a steady state
    - optimize queries and architecture
    - compatible with the rest of the world of technology
- graceful reorg and incorrect optimistic state handling
- friendly error management
    - developers get reasonable error contexts
    - consumers get _explanations_ about errors
    - allows anyone to know (i) that something occurred and (ii) _why_ it occurred
- supports replay from arbitrary blocks to (i) bootstrap the steady state and (ii) resume after failures
- default output is catered towards a graphql consuming client

## Key Ideas

You can think of it as a "server-side" apollo-client where the blockchain you're querying is the apollo-server.

### Transactions and Blocks

Every write to the blockchain is dependent on (i) the transaction being included in a block and (ii) that block being various states of valid.

The system keeps an entire log of everything that occurs to the transactions and blocks we care about, including which state is derived from them, allowing it to cascade changes throughout the database in the event that the optimistic view is incorrect.

For example, if a transaction adds a number to a counter, the optimistic view is that it will succeed and the counter should be equal to `prev + 1`. The counter's state is now dependent on that tx, which is dependent on its block, either of which can be determined to be invalid at any point in the future. These _things_ that have dependencies on their validity are called *artifacts*. In the event a dependency is invalidated, all artifacts of that dependency must be invalidated as well—and the user notified of this change.

### Artifacts

Atifacts are state (specifically, state _changes_) that depend on some variable-validity artifact before it. A tx is an artifact of a block. A block is an artifact of the previous block. A counter's state being `prev + 1` is an artifact of the tx that causes that state change.

All artifacts:

- are universally addressable by a UUID
- have 0 or more dependent artifacts upon which their validity depends
- are never deleted; only validated (with confidence intervals) or invalidated (with confidence intervals)
- have an `event_log` associated with them

This architecture allows a client to never be "unknowingly wrong" about the state of the world. That is, if it thinks that the state is `6` due to artifact `abcd`, but artifact `abcd` had been invalidated without the client's knowledge (due to a disconnect, for example), future requests for information about artifact `abcd` (and artifacts that depend on `abcd`) still contain the context that (i) it was invalidated and (ii) it was invalidated because it was in an uncle block (for example).

And artifact's confidence interval (how likely it is valid) is a function of all of its dependencies (namely, blocks). As the blockchain grows, later blocks are considered more likely to be _finalized_ (e.g. 100% validity), which affects the validity of all blocks after it (and the transactions within those blocks and the artifacts that result as a state change cause by that transaction).

The artifacts and the dependency chain is represented as a directed graph.

(maybe we'll use a graphdb for this, idk, but postgres should be chill for now)

## Filter-Map-Reduce

You can think of gnarly as server-side redux, stored in a persistent database.

The core functionality is a filter, map, and reduction over all blockchain actions. An "action" is literally anything you want to describe; perhaps it's a set of all transactions to your contract. Perhaps every single transaction ever created produces an action. Perhaps it's the indication that an `Event()` was fired. It's arbitrary, much in the same way that redux action can describe anything; all that matters is firing them appropriately.

The system looks primarily like:

```
# filter, map across blockchain to produce actions
([block]) => [action]

# reduce actions to produce subsequent state
(state, action) => state'
```

## GraphQL

The resulting state is persisted into a datastore of your choice. For now, this is probably CouchDB.

This datastore is then fed to the client by a GraphQL server (apollo) supporting subscriptions.

## Optimistic Transactions

Without optimistic transactions, this steady state would stay in lock-step with the blockchain (or at least, your node's view of the blockchain). That is, if a tx takes 10 minutes to get into a block, your persistent state has no knowledge of it until it has been included (beyond pulling it from the mempool, etc, but don't worry about that for now).

To enable truly responsive blockchain interfaces, we can apply learnings from webdev.

Upon every transaction submitted to the network, the client _also_ submits the following information to gnarly. (Optionally, the client can defer tx submission to Ethereum to gnarly as well, removing the need for a separate Ethereum node connection client-side, at the expense of centralization.)

1. The transaction details and the signature against it.
    - This allows gnarly to calculate the transaction hash and observe it across its lifetime, as well as confirm the signer's address.
2. The specific action(s) that will be produced by this transaction.
    - This allows us to quickly propagate the expected state to the store.

So the client says something like

```
buyKitten(tx, signedtxhash)
```

from which the backend can
1. get the address from the signature
2. Do any validation of the transaction:
    - check that that transaction is indeed calling the correct function `buyKitten` by reversing the abi
    - and then derive the kitten id
3. Produce the correct action(s) corresponding to this event.

These actions are then presented to the system as a new block


## System Components

### Actions

Actions follow the flux-standard-action (FSA) pattern, with some additional requirements. All actions must have a `_REASON` key that corresponds to a platform-specific, but well-known reason. AKA, a key that you can look up to communicate to a user why this action was created.

```js
{
    type: 'YOUR_ACTION_TYPE',
    payload: {
        // any data necessary for reduction later down the road
    },
    _REASON: 'MY_REASON',
    meta: {
        // any metadata necessary for communicating context about the action
    }
}
```

### Action Producer Manager

This module accepts a set of action producers that produce actions. It calls them iteratively per-block. Each Action Producer has only one action type that is its responsibility.

@TODO - this should probably be a generator or something, but I need to learn about them

```js
const actionsFromAddressProducer = (config) => (block, tx) => {
    if (tx.from === config.from) {
        // this is either a generator emit or just like an array push, idc
        // we will also use the Action Creator concept here as well,
        //   but this is more explicit to indicate that this is nothing special
        emit({
            type: 'TX',
            payload: tx,
            _REASON: 'TX_FROM_ADDRESS',
            meta: {
                addr: config.from
            }
        })
    }
}

// the manager just takes every tx in a block and uses the producers to produce actions
const producerManager = (producers) => (block) => {
    return block.txs.map(tx => producers.map(block, tx))
}

// a producer to create actions from any tx that occurs from my address
const actionsFromMyAddress = actionsFromAddressProducer({ from: MY_ADDRESS })

// the root producer that is given a block to produce actions
const rootProducer = producerManager([ actionsFromMyAddress ])

// somewhere else in the code, on block events...
for (const block in blockchain) {
    const newActions = rootProducer(block)
    // we have our new actions!
}
```

Using this model, we can produce actions from any arbitrary information contained within a full block.

### Action Reducers

We then use the exact same architecture of redux (including much of redux's code, re-exported) to propagate these actions through reducers to effect state changes.

Gnarly uses the `immer` model for indicating state transitions, because loading your tables into memory isn't really feasible. Instead, your reducer (producer, in `immer` terminology (and I know that's confusing, but maybe I'll think of a better name later)) is given a database connection by which it can look up the information it requires (if any) to know what state changes to apply.

Of note, the database view provided to the reducer is time-dependent; it provides a snapshot of the database at the given time, not as it is at the present moment. This is important for replay functionality.

The `producer` argument to the reducer is a object that provides primitives for constructing a set of database commands that are batched into a single transaction for the entire block under consideration.

Almost every db transaction produced by this reducer that affects an artifact should come with a `_REASON` to be applied to the event log.



```js
import { combineReducers } from 'redux'

const counters = (db, action, producer) => {

    // whatever this looks like for the db adaptor
    producer.produce(`
        UPDATE counters
        SET value = value + 1
        WHERE from = $1
    `, [ action.payload.from ])

    // produce an event log
    producer.produce(`
        INSERT INTO event_log (artifact_id, reason, meta)
        VALUES ($1, $2, $3)
    `, [artifact_id, action._REASON, action.meta])
}

// do we really need the object here? the keys don't really mean anything (yet?)
export default combineReducers({
    counters
})
```

### Persistence and State Updates

All database transactions that are produced by the reducers in response to actions are then executed within a single command to apply them to the store.

Every change to an artifact can be tied to a block number (and then invalidated in the case of a rollback).

### Validity Monitor

Across the board, we'll have to monitor the validity of various artifacts in the system and keep them updated. Something's got to keep track of all of this nonsense and keep these dependencies updated.

Some of these validity changes are implied by new events (say, a new block is created on top of another) and can be updated inline. Others are more asynchronous (say, a transaction entering the mempool) and will need to be monitored.

## TODO

I need to think more about views, timetravel databases (aka blockchains, lol), and how to better represent state changes as dependencies to actions.

In the event of a rollback (for whatever reason), it should be a relatively straightforward process to:
- find all artifacts of a block
    - find all artifacts of the txs of a block
    - etc etc all the way down
- invalidate them
- roll back any state nicely so that the steady state is again accurate (and make sure confidence intervals are re-applied correctly)

This might actually require a little mini blockchain-as-a-database kinda thing. BigchainDB?