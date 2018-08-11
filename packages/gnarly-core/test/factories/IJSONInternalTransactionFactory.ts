import { Factory } from 'rosie'

export default new Factory()
  .attrs({
    action: () => ({
      callType: '0x0',
      from: '0x0',
      gas: '0x0',
      input: '0x0',
      to: '0x0',
      value: '0x0',
    }),
    result: () => ({
      gasUsed: '0x0',
      output: '0x0',
    }),
    subtraces: () => 0,
    traceAddress: () => [],
    type: 'CALL',
    error: null,
  })
