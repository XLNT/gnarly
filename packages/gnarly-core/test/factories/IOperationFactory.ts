import { Factory } from 'rosie'
import { uuid } from '../../src/utils'

export default new Factory()
  .attrs({
    id: () => uuid(),
    path: '',
    op: '',
    // value: undefined,
    // oldValue: undefined,
    volatile: false,
  })
