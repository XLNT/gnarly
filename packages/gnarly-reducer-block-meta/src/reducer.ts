import {
  appendTo,
  because,
  Block,
  emit,
  IReducer,
  ITypeStore,
  ReducerType,
} from '@xlnt/gnarly-core'

const makeReducer = (
  key: string = 'blocks',
  typeStore: ITypeStore,
) => (
): IReducer => {
  const makeActions = (state: object) => ({
    emitBlock: (block: Block) => {
      emit(appendTo(key, 'blocks', {
        hash: block.hash,
        transactionId: block.hash,
        // ^ assumes that gnarly.transactionId === block.hash
        number: block.number.toString(),
        unsafeNumber: block.number.toString(),
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

  return {
    config: {
      type: ReducerType.Atomic,
      key,
      typeStore,
    },
    state: {},
    reduce: async (state: object, block: Block): Promise<void> => {
      const actions = makeActions(state)
      because('BLOCK_PRODUCED', {}, () => {
        actions.emitBlock(block)
      })
    },
  }
}

export default makeReducer
