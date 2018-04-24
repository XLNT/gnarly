interface IInputOutput {
  name: string
  type: string
}

export interface IABIItemInput {
  constant: boolean
  inputs: IInputOutput[]
  name: string
  outputs: IInputOutput[]
  payable: boolean
  stateMutability: string
  type: string
}

export default interface IABIItem extends IABIItemInput {
  signature: string
  // ^ 0x12345678
  fullName: string
  // ^ doThing(uint256)
}

export const isMethod = (item: IABIItem): boolean => item.type === 'function'
export const isEvent = (item: IABIItem): boolean => item.type === 'event'
