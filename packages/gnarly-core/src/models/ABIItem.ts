export interface IInputOutput {
  name: string
  type: string
  indexed?: boolean
}

export interface IABIItemInput {
  anonymous?: boolean
  constant?: boolean
  inputs?: IInputOutput[]
  name: string
  outputs?: IInputOutput[]
  payable?: boolean
  stateMutability?: string
  type: string
}

export default interface IABIItem extends IABIItemInput {
  signature: string
  // ^ 0x1234567890.......
  fullName: string
  // ^ doThing(uint256)
  shortId: string
  // ^ 0x12345678 (guaranteed to be 10 characters)
}

export const isMethod = (item: IABIItem): boolean => item.type === 'function'
export const isEvent = (item: IABIItem): boolean => item.type === 'event'
