# 🤙 Gnarly

> Gnarly’s reduces blockchain events into a steady state with confidence.
>
> And that’s fuckin’ gnarly.

-----> [Read the Medium post for more details](https://medium.com/xlnt-art/solving-severe-asynchronicity-with-gnarly-51f5310e5543)

⚠ WIP ⚠

Join #gnarly in https://xlnt.chat if you're interested in the state of the project.

## Description

The simple description of gnarly is that it's a stream-processor for atomic events that persists its internal state to disk, following the solid-state-interpreter pattern ala Urbit.

This means it processes blocks (either from the past or in real-time) and can gracefully handle restarts, reorgs, forks, and more. You tell it how to process your data and how to load that data into something else (like postgres, redshift, elasticsearch).

Gnarly simplifies the process of taking information _from_ a blockchain and putting it somewhere else, usually in a webapp-friendly format like a SQL database or elasticsearch cluster.

## Usage

TBD - check `gnarly-bin` for inspo.

(previous documentation was out-of-date, will be writing new ones once the api is solid)

## Developer Installation / Setup

First, clone this repo.

```bash
lerna bootstrap
```

Want to watch all of the files and recompile the typescript?

```bash
yarn run watch-ts
```

Want to build all of the typescript projects once?

```bash
yarn run build-ts
```

Want to build a mac and linux binary of `gnarly-bin`?

```bash
yarn run build-bin
```

Want to package that into a docker container?

```bash
yarn run docker-build
# yarn run docker-push
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
