import {
  ITxExtra,
} from '../../src/Ourbit'

class OurbitMock {
  public processTransaction = async (
    txId: string,
    fn: () => Promise<void>,
    extra: ITxExtra = { blockHash: '' },
  ) => {
  }

  public rollbackTransaction = async (txId: string) => {

  }

  public async resumeFromTxId (txId: string) {

  }
}

export default OurbitMock
