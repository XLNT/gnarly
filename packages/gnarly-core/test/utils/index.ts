import chai = require('chai')

export const expectThrow = async (p) => {
  try {
    await p
  } catch (error) {
    throw new chai.AssertionError('Expected promise to throw, but it did not.')
  }
}
