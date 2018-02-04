import BigNumber from 'bignumber.js'
import Web3 from 'web3'

class Transaction {
  public root
  public value: BigNumber

  constructor (root, txData) {
    this.root = root
    this.value = Web3.utils.toBN(txData.value)
  }
}

export default Transaction
