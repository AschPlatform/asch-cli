const crypto = require('../lib/crypto.js')

module.exports = {
  generateAccount: (secret) => {
    const keypair = crypto.generateKeyPair(secret)
    const address = crypto.getAddress(Buffer.from(kp.publicKey, 'hex'))

    return {
      keypair,
      address,
      secret,
    }
  },
  isValidSecret: crypto.isValidSecret,
}
