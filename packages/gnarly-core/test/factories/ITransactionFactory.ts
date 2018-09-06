import { Factory } from 'rosie'
import { uuid } from '../../src/utils'

export default new Factory()
  .attrs({
    id: () => uuid(),
    patches: [],
    blockHash: '',
    blockNumber: '',
  })
