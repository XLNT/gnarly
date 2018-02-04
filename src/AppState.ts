import BigNumber from 'bignumber.js'
import {
    action,
    autorun,
    computed,
    observable,
    transaction,
    useStrict,
} from 'mobx'

import Block from './Block'

class AppState {
    // should use a linked list / tree situation with a HEAD tracker?
    @observable public blocks: Block[] = []

    @computed
    get weight () {
        return this.blocks.reduce((bv, block) =>
            bv.plus(block.transactions.reduce((txv, tx) =>
                txv.plus(tx.value),
                new BigNumber(0))),
            new BigNumber(0))
    }

    @computed
    get numTransactions () {
        return this.blocks.reduce((bv, block) =>
            bv + block.transactions.length,
            0)
    }

    @action.bound
    public handleNewBlockData (blockData) {
        transaction(() => {
            this.blocks.push(new Block(this, blockData))
        })
    }

    @action.bound
    public invalidateBlockData (block: Block) {
        transaction(() => {
            // find by block hash, invalidate
        })
    }
}

export default AppState
