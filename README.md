> ## 🛠 Status: Alpha, Postponed Development
> gnarly is currently in 'hella alpha'. If you'd like to play around with it, check out the usage instructions below.


# 🤙 Gnarly

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme) [![Open Source Love](https://badges.frapsoft.com/os/v2/open-source.svg?v=1)](https://github.com/ellerbrock/open-source-badges/) [![Build Status](https://travis-ci.com/XLNT/gnarly.svg?branch=master)](https://travis-ci.com/XLNT/gnarly) [![Coverage Status](https://coveralls.io/repos/github/XLNT/gnarly/badge.svg?branch=master)](https://coveralls.io/github/XLNT/gnarly?branch=master)


> Gnarly reduces blockchain events into a steady state with confidence.
>
> And that’s fuckin’ gnarly.

💬 Join #gnarly in https://xlnt.chat if you're interested in chatting in real-time about the project.

## Background

For a 15 minute talk about why projects like gnarly need to exist, watch this recording from BuildETH:

[![Matt at BuildETH](https://img.youtube.com/vi/PpcsFPeLjcw/0.jpg)](https://www.youtube.com/watch?v=PpcsFPeLjcw)

Reading state from a blockchain is unecessarily hard because data is never indexed in the format your client expects, often requiring `n+1` queries to get the information you want, like token balances.

**Gnarly takes all the data you care about, transforms it, and puts it somewhere else, in real-time.** It also handles short-lived forks and helps you understand _when_, and _how_, and _why_ your data was changed.

This means read-only operations are fast and efficient and can leverage the existing web developer tooling we've developed over the last 30 years—requesting all of a user's token balances takes milliseconds, not entire seconds due to individual requests to every token contract.

This model allows us to also tackle the _"severe asychronicity"_ of Proof of Work networks: state changes take seconds or minutes to resolve before they can confidently be displayed to the user, so users are stuck with a terrible experience of **laggy frontends**, infinite spinners, and **zero context** into what's happening behind the scenes. Until a state change completes, **users don't have confidence** that they can move onto the next thing they were doing.

<details>
    <summary>The Downsides and Tradeoffs when Using Gnarly</summary>
    <p>
        Gnarly is a centralized state store, so you immediately trade away decentralization for user experience. We have a plan (decentralized snapshots) to support client-side gnarly indexes, but this is still a ways away.
    </p>
    <p>
        Syncing a gnarly indexer is _slow_; it's about 15x faster than real-time. So if we want to index all of the CryptoKitties, which have been around for 6 months, it'll take around 12 days.
    </p>
    <p>
        Obviously, it can easily keep up with the 15 second block times offered by the Ethereum main and test networks, so if you run a gnarly indexer as you launch your product, you won't experience this issue. We're naturally working hard on maximizing gnarly's processing speed.
    </p>
</details>

## Description

To recap, the features of gnarly are that it:
- allows your client to use a reactive data source for reading blockchain state,
- produces this reactive data source in real-time as blocks are produced,
- the state is shared, allowing for superior frontend user experiences (like removing an exchange listing once it's been purchased),
- handles short-lived-forks, reorganizations, etc all behind the scenes,
- if gnarly crashes, it can resume exactly where it left off by replaying patches to arrive at the current state (kinda like git! (or a blockchain!))
- produces an append-only event log that informs the developer and the user about *when* and *why* a state change was made (use this for very nice user-facing notifications!)
- (WIP) supports optimistic transactions for highly real-time, reactive clients

The simple description of gnarly is that it's a single-process  stream-processor (aka a real-time extra-transform-load) tool for atomic events, following the solid-state-interpreter pattern, poplarized by [Urbit](https://urbit.org/).

Gnarly ingests blocks (either histoical blocks or in real-time) transforms your data, and then loads that data into something else (like postgres, redshift, or elasticsearch).

The way you tell gnarly how to produce the data you care about is via a **reducer**. For example, we have already made a few reducers like
- [gnarly-reducer-erc721](/packages/gnarly-reducer-erc721) — for indexing ERC721 non-fungible tokens
- [gnarly-reducer-events](/packages/gnarly-reducer-events) — for indexing Ethereum contract events
- [gnarly-reducer-block-meta](/packages/gnarly-reducer-block-meta) — for indexing information about blocks, like their number, difficulty, timestamp, and more

You can then integrate these indexes (which are just normal postgres tables!) into your application. For example, see [XLNT/paperboy](https://github.com/XLNT/paperboy) for a resilient event websocket powered by gnarly.

## Setup

```bash
# clone this project
git clone git@github.com:XLNT/gnarly.git

# cd into it
cd gnarly

# install yarn if you haven't already
# $ npm i -g yarn

# install workspace dependencies, which includes lerna
yarn install

# boostrap the packages within this project (install deps, linking, etc)
lerna bootstrap

# now this command should pass:
yarn run build-ts
```

Now you should be able to run the tests with

```bash
yarn run test
```

## Running

If you're a developer that would like to use gnarly, you can use the `gnarly-bin` project. The `gnarly-bin` project is a configuration-friendly approach for using gnarly. By telling it which reducers you care about, it produces a linux- and macos-friendly docker container that you can get started with immediately.

*Note:* Right now, `gnarly-bin` doesn't actually do any of the configuration stuff; it's just some code. [See here for how it works](/packages/gnarly-bin/src/index.ts). Curently `gnarly-bin` is just configured with the above reducers to monitor CryptoKitty events and block metadata.

### Building a Gnarly Binary

To build the project in `gnarly-bin`, do the following:

```bash
# build the typescript files
yarn run build-ts

# build a linux- and macos- binary
yarn run pkg

# build a docker container to run that binary
yarn run docker-build

# push that docker container
yarn run docker-push

# (or just do it all at once)
# $ yarn run deploy
```

## Developer Installation / Setup

Here's what I do when I'm manually testing gnarly:

```bash
# //packages/gnarly-bin/.env
DEBUG=*
# ^ which logs do you want to see? * means all of them. See node-debug for info
NODE_ENDPOINT=http://localhost:8545
# ^ point it at an Ethereum node like ganache, Infura, or a personal node
DB_CONNECTION_STRING=postgresql://postgres@localhost:5432/default
# ^ point it at an output store (like postgres)
GNARLY_RESET=false
# ^ if GNARLY_RESET=true, gnarly-bin will nuke the output store before running
LATEST_BLOCK_HASH=
# ^ set this to a block hash if you want gnarly to run from a specific block

# note that you can remove logs by using the -prefix:* syntax
# like: "DEBUG=*,-sequelize:*"
```

```bash
# in one terminal window from //
yarn run watch-ts

# in one terminal window from //packages/gnarly-bin
yarn run ts-start
```

And then your gnarly-bin project will be running with local code changes.

### Developer Scripts

Want to watch all of the files and recompile the typescript?

```bash
yarn run watch-ts
```

Want to build all of the typescript projects once?

```bash
yarn run build-ts
```

## Writing a Reducer

If the first-party reducers don't cover your needs, you can easily write your own reducer and plug it into your gnarly instance.

> ‼ This section will almost definitely be out of date during the alpha! Use the source code as the source of truth for documentation until the internal API becomes stable.

Look at [gnarly-reducer-erc721](/packages/gnarly-reducer-erc721) or [gnarly-reducer-events](/packages/gnarly-reducer-events) or [gnarly-reducer-block-meta](/packages/gnarly-reducer-block-meta) for inspiration and up-to-date examples, but here we go!

A reducer is a way to tell gnarly how to change the state you manage. You also include a `TypeStore` which tells gnarly how to store the state you're producing.

Here's an example of a reducer to track events:

```ts
import {
  addABI,
  appendTo,
  because,
  Block,
  emit,
  forEach,
  getLogs,
  IABIItemInput,
  ILog,
  IReducer,
  ReducerType,
  toHex,
} from '@xlnt/gnarly-core'
import flatten = require('arr-flatten')

const makeReducer = (
  key: string,
  config: { [_: string]: IABIItemInput[] } = {},
): IReducer => {
  const addrs = Object.keys(config)

  // add the abis to the global registry
  // this is how we determine if this event is one we care about or not
  for (const addr of addrs) {
    addABI(addr, config[addr])
  }

  // given a state, build a set of actions that operate over that state
  //   in this case, we don't have any mutable state! so `state` isn't
  //    actually used here
  // see gnarly-reducer-erc721 for an example of using mutable state
  const makeActions = (state: object) => ({
    // define an `emit` action
    emit: (log: ILog) => {
      // this emit action uses gnarly.emit to produce an immutable
      //   append operation to the events domain within the reducer's key
      //   this operation includes all of the information your TypeStore needs
      emit(appendTo('events', {
        address: log.address,
        event: log.event,
        eventName: log.eventName,
        signature: log.signature,
        args: log.args,
      }))
    },
  })

  // we give gnarly a ReducerConfig, which tells it how this reducer
  //   operates and should be run
  return {
    config: {
      // this reducer is an Atomic reducer
      //   (i.e., it doesn't care about _when_ it is run and doesn't
      //    operate on past information)
      type: ReducerType.Atomic,
      // it has a key of `key`, necessary to scope its operations
      //   in the database
      key,
    },
    state: {},
    // the reduction function! accept the previous state and the block
    // and produce changes to the state
    reduce: async (state: object, block: Block): Promise<void> => {
      // let's build our actions from above
      const actions = makeActions(state)

      // let's pull the logs for every address we care about this block
      const logs = await forEach(addrs, async (addr) => getLogs({
        fromBlock: toHex(block.number),
        toBlock: toHex(block.number),
        address: addr,
      }))

      // then we'll look through those logs for ones that we recognize
      flatten(logs).forEach((log) => {
        const recognized = log.parse()
        if (recognized) {
          // and then emit them!
          because('EVENT_EMITTED', {}, () => {
            actions.emit(log)
          })
        }
      })
    },
  }
}

export default makeReducer
```

That's how easy it is to make a reducer to track events on Ethereum. This reducer automatically stays up to date with the latest block and all those other fun features from above. Neat!

Look in the [gnarly-reducer-events](/packages/gnarly-reducer-events) folder for the rest of the example files.
