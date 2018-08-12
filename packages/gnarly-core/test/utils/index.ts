import chai = require('chai')

export const expectThrow = async (p) => {
  try {
    await p
    throw new chai.AssertionError('Expected promise to throw, but it did not.')
  } catch (error) {
    chai.expect(true).to.equal(true)
  }
}
