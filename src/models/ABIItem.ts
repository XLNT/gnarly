interface IInputOutput {
  name: string
  type: string
}

export default interface IABIItem {
  constant: boolean
  inputs: IInputOutput[]
  name: string
  outputs: IInputOutput[]
  payable: boolean
  stateMutability: string
  type: string
}
