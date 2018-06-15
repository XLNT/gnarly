import {
  IOperation,
  OpCollector,
} from '../ourbit/types'

import {
  IReducerUtils,
  OperationPerformerFn,
  PatchGenerator,
} from './types'

class ReducerContext {

  public utils: IReducerUtils

  private currentReason: string = null
  private currentMeta: any = null

  private forceGeneratePatches: PatchGenerator
  private opCollector: OpCollector

  constructor (
    private key: string,
  ) {
    this.utils = {
      because: this.because,
      operation: this.operation,
      emit: this.emit,
    }
  }

  public because = (reason: string, meta: any, fn: OperationPerformerFn) => {
    this.currentReason = reason
    this.currentMeta = meta

    this.operation(fn)

    this.currentReason = null
    this.currentMeta = null
  }

  public getCurrentReason = () => {
    return this.currentReason !== null
      ? { key: this.currentReason, meta: this.currentMeta }
      : undefined
  }

  /**
   * Perform an explicit operation, which is most likely order-dependent
   */
  public operation = (fn: OperationPerformerFn) => {
    fn()
    this.forceGeneratePatches()
  }

  /**
   * Emit a specific operation, which is not tracked in the local state
   * This should be used for immutable information
   * (namely, event logs)
   */
  public emit = (op: IOperation) => {
    this.opCollector(op)
  }

  public setOpCollector = (fn: OpCollector) => {
    this.opCollector = fn
  }

  public setPatchGenerator = (fn: PatchGenerator) => {
    this.forceGeneratePatches = fn
  }
}

export default ReducerContext
