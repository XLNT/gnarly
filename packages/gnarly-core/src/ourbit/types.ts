/**
 * An Operation is a state transition.
 * It is invertable via oldValue.
 * If it is volatile, it is not persisted in memory and is handled differently.
 */
export interface IOperation {
  path: string,
  op: 'add' | 'replace' | 'remove' | 'move' | 'copy' | 'test' | '_get',
  // ^ we will only actually have add|replace|remove
  // but fast-json-patch expects this type so whatever
  value?: any,
  oldValue?: any,
  volatile: boolean
}

/**
 * A reason for a patch
 */
export interface IReason {
  key: string
  meta: any
}

/**
 * a gnarly-specific path generated from patch.op.path
 */
export interface IPathThing {
  tableName: string
  pk: string
  indexOrKey: string
}

/**
 * A Patch is a set of operations with a unique id and a reason for their existence.
 */
export interface IPatch {
  id: string
  reason?: { key: string, meta?: any }
  operations: IOperation[],
}

/**
 * A transaction is a set of patches with a unique id.
 */
export interface IBasicTransaction {
  id: string
  patches: IPatch[]
}

export interface ITxExtra {
  blockHash: string
  blockNumber: string
}

export interface ITransaction extends IBasicTransaction, ITxExtra {}

export type OpCollector = (op: IOperation) => void

/**
 * This function accept patches and persists them to a store.
 */
export type PersistPatchHandler = (txId: string, patch: IPatch) => Promise<void>
