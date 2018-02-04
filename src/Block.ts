import {
    action,
    computed,
    observable,
} from 'mobx'

import Transaction from './Transaction'

class Block {
    public number: number
    public hash: string
    public parentHash: string
    public nonce: string
    public sha3Uncles: string
    public logsBloom: string
    public transactionsRoot: string
    public stateRoot: string
    public receiptsRoot: string
    public miner: string
    public difficulty: number
    public totalDifficulty: number
    public extraData: string
    public size: number
    public gasLimit: number
    public gasUsed: number
    public timestamp: number
    public uncles: string[]
    @observable public transactions: Transaction[]
    @observable public validity: number

    private root
    constructor (root, blockData) {
        this.root = root
        this.number = blockData.number
        this.hash = blockData.hash
        // @TODO(shrugs) - the rest of these properties
        this.transactions = blockData.transactions.map((tx) => new Transaction(root, tx))
    }

    @computed
    get isValid () {
        return this.validity > 0
    }

    @computed
    get isInvalid () {
        return this.validity === 0
    }
}

export default Block
