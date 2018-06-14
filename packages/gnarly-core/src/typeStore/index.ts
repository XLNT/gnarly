import { IOperation } from '../ourbit/types'

export type TypeStorer = (txId: string, patch: IOperation) => Promise<void>
export type SetupFn = () => Promise<any>
export type SetdownFn = () => Promise<any>
export interface ITypeStore {
  [_: string]: TypeStorer | SetupFn | SetdownFn,
}

export {
  default as SequelizeTypeStorer,
} from './Sequelize'
