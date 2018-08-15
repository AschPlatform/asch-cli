const crypto = require('../lib/crypto.js')

module.exports = {
  account: (secret) => {
    const kp = crypto.keypair(secret)
    const address = crypto.getAddress(Buffer.from(kp.publicKey, 'hex'))

    return {
      keypair: kp,
      address,
      secret,
    }
  },

  isValidSecret: crypto.isValidSecret,
}
