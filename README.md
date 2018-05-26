> ## 🛠 Status: In Development
> gnarly is currently in development. If you'd like to play around with it, check out the usage instructions below.


# 🤙 Gnarly

[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme) [![Open Source Love](https://badges.frapsoft.com/os/v2/open-source.svg?v=1)](https://github.com/ellerbrock/open-source-badges/)


> Gnarly’s reduces blockchain events into a steady state with confidence.
>
> And that’s fuckin’ gnarly.

💬 Join #gnarly in https://xlnt.chat if you're interested in chatting in real-time about the project.

## Background

Reading state from a blockchain is unecessarily hard because data is never indexed in the manner your client expects, often requiring `n+1` queries to a server that's already bogged down by running an Ethereum node.

**Gnarly takes all the data you care about and puts it somewhere else in a better format, and in real-time** (postgresql for now). It also handles short-lived forks and helps you understand when and how your data was changed.

This means read-only operations are as fast and efficient as all of your normal requests across the web, and they can leverage the various tooling we've developed over the last 30 years. Requesting all of a user's token balances takes milliseconds, not entire seconds and individual requests for every token contract.

This model allows us to also tackle the "severe asychronicity" of most blockchain networks: state changes take seconds or minutes to resolve before they can confidently be displayed to the user, so users are stuck with a terrible experience of laggy frontends, infinite spinners, and zero visibility into what's happening behind the scenes. Until a state change completes, users don't have confidence that they can move onto the next thing they were doing.

<details>
    <summary>The Downsides and Tradeoffs when Using Gnarly</summary>
    <p>
        Gnarly is a centralized state store, so you immediately trade away decentralization for user experience. We have a plan (decentralized snapshots) to support client-side gnarly indexes, but this is still a ways away.
    </p>
    <p>
        Syncing a gnarly indexer is _slow_; it's around 1 block/second on average in tests. This means that creating an index from something far in the fast is likely to take 15x shorter time than the time the events are being emitted. So if we want to index all of the CryptoKitties, which have been around for 6 months, it'll take around 12 days.
    </p>
    <p>
        Obviously, it can easily keep up with the 15 second block times offered by the Ethereum main and test networks, so if you run a gnarly indexer as you launch your product, you won't experience this issue. We're naturally working hard on maximizing gnarly's processing speed.
    </p>
    <p>
        Runtime modification of the gnarly indexer is yet to be implemented. i.e. "a user with address `0x1` signed up, index all of their token transfers from the beginning of time". For now, gnarly is best used when the set of all inputs is known beforehand.
    </p>
</details>

## Description

To recap, the features of gnarly are that it:
- allows your client to use a reactive data source for reading blockchain state,
- produces this reactive data source in real-time as blocks are produced,
- the state is shared, allowing for more clever frontends (that, say, remove an exchange listing once it's been purchased with 0 confirmations),
- handles short-lived-forks, reorganizations, etc all behing the scenes,
- if gnarly crashes, it can resume exactly where it left off by replaying patches to arrive at the current state (kinda like git! or a blockchain!)
- produces an append-only event log that informs the developer and the user about *when* and *why* a state change was made (use this for very nice user-facing notifications!)
- (WIP) supports optimistic transactions for highly real-time

The simple description of gnarly is that it's a stream-processor (aka a real-time extra-transform-load) tool for atomic events, following the solid-state-interpreter pattern like [Urbit](https://urbit.org/).

Gnarly ingests blocks (either histoical blocks or in real-time) and you tell it how to process your data and how to load that data into something else (like postgres, redshift, elasticsearch).

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

# boostrap the packages within this project (install deps, linking, etc)
lerna bootstrap
```

## Usage

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

Want to watch all of the files and recompile the typescript?

```bash
yarn run watch-ts
```

Want to build all of the typescript projects once?

```bash
yarn run build-ts
```

Want to build a linux- and macos- binary of `gnarly-bin`?

```bash
yarn run pkg
```

Want to package that into a docker container?

```bash
yarn run docker-build
# then `yarn run docker-push`
```

## TODO

We'd love your help with any of this stuff

- [x] automated testing with mocha/chai/etc
  - [ ] travis integration
  - [ ] more ourbit unit tests
  - [ ] ourbit integration tests against sqlite (optional)
  - [ ] blockstream unit test with mock blockstream
  - [x] test utils file
  - [ ] full gnarly integration tests
- [ ] any sort of overall architecture improvements
- [ ] replace block reconciliation polling with a web3 filter
- [ ] what should the developer-friendly cli/binary look like? config ala redis/parity? opinions wanted!
