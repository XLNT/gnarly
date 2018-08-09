import { Factory } from 'rosie'

export default new Factory()
  .attrs({
    hash: () => '0x0',
    nonce: () => '0x0',
    blockHash: () => '0x0',
    blockNumber: () => '0x0',
    transactionIndex: () => '0x0',
    from: () => '0x0',
    to: () => '0x0',
    value: () => '0x0',
    gasPrice: () => '0x0',
    gas: () => '0x0',
    input: () => '0x0',
  })
