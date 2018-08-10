import { Factory } from 'rosie'

export default new Factory()
  .attrs({
    number: () => '0x0',
    hash: () => '0x0',
    parentHash: () => '0x0',
    nonce: () => '0x0',
    sha3Uncles: () => '0x0',
    logsBloom: () => '0x0',
    transactionsRoot: () => '0x0',
    stateRoot: () => '0x0',
    miner: () => '0x0',
    difficulty: () => '0x0',
    totalDifficulty: () => '0x0',
    extraData: () => '0x0',
    size: () => '0x0',
    gasLimit: () => '0x0',
    gasUsed: () => '0x0',
    timestamp: () => '0x0',
    transactions: () => [],
    uncles: () => [],
  })
