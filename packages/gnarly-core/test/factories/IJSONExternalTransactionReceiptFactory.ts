import { Factory } from 'rosie'

export default new Factory()
  .attrs({
    blockHash: () => '',
    blockNumber: () => '',
    contractAddress: () => '',
    cumulativeGasUsed: () => '',
    from: () => '',
    gasUsed: () => '',
    logs: () => [],
    logsBloom: () => '',
    status: () => '',
    to: () => '',
    transactionHash: () => '',
    transactionIndex: () => '',
  })
