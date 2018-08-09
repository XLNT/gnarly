import { Factory } from 'rosie'

export default new Factory()
  .attrs({
    address: () => '0x0',
    topics: () => [],
    data: () => '0x0',
    blockNumber: () => '0x0',
    blockHash: () => '0x0',
    transactionHash: () => '0x0',
    transactionIndex: () => '0x0',
    logIndex: () => '0x0',
    removed: () => false,
  })
