# 🤘 Gnarly

> Gnarly’s reduces blockchain events into a steady state with confidence.
>
> And that’s fuckin’ gnarly.

-----> [Read the Medium post for more details](https://medium.com/xlnt-art/solving-severe-asynchronicity-with-gnarly-51f5310e5543) <-----

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

You can think of it as a "server-side" apollo-client where the blockchain you're querying is the apollo-server.

Gnarly uses the ideas behind redux and MobX to convert imperative blockchain events to declarative, reactive state.


## Technology
Any/all of this can change, but here are the technologies currently used. Note that gnarly should be able to be used in both a browser and server-side environment.

- Typescript
- MobX
- [future] [Parcel](https://github.com/parcel-bundler/parcel)
- ethereumjs-blockstream
- GraphQL
