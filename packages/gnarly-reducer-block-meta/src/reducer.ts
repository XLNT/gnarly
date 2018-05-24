import {
  appendTo,
  because,
  Block,
  emit,
  IReducer,
  operation,
  ReducerType,
} from '@xlnt/gnarly-core'

const makeReducer = (
  key: string = 'blocks',
): IReducer => {
  const makeActions = (state: undefined) => ({
    emitBlock: (block: Block) => {
      emit(appendTo(key, 'blocks', {
        hash: block.hash,
        transactionId: block.hash,
        // ^ assumes that gnarly.transactionId === block.hash
        number: block.number.toString(),
        parentHash: block.parentHash,
        nonce: block.nonce.toString(),
        sha3Uncles: block.sha3Uncles,
        logsBloom: block.logsBloom,
        transactionsRoot: block.transactionsRoot,
        stateRoot: block.stateRoot,
        miner: block.miner,
        difficulty: block.difficulty.toString(),
        totalDifficulty: block.totalDifficulty.toString(),
        size: block.size.toString(),
        gasLimit: block.gasLimit.toString(),
        gasUsed: block.gasUsed.toString(),
        timestamp: new Date(block.timestamp.toNumber() * 1000),
      }))
    },
  })

  // return the reducer
  return {
    config: {
      type: ReducerType.Atomic,
      key,
    },
    state: undefined,
    reduce: async (state: undefined, block: Block): Promise<void> => {
      const actions = makeActions(state)
      because('BLOCK_PRODUCED', {}, () => {
        actions.emitBlock(block)
      })
    },
  }
}

export default makeReducer
