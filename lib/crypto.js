const crypto = require('crypto-browserify')
const Mnemonic = require('bitcore-mnemonic')
const AschJS = require('asch-js')
const nacl = require('js-nacl').instantiate()

const getRandomString = (max) => {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%^&*@'

  for (let i = 0; i < max; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

const generateKeyPair = (secret) => {
  const hash = crypto.createHash('sha256').update(secret, 'utf8').digest()
  const kp = nacl.crypto_sign_keypair_from_seed(hash)

  return {
    publicKey: Buffer.from(kp.signPk).toString('hex'),
    privateKey: Buffer.from(kp.signSk).toString('hex'),
  }
}

const sign = (keypair, data) => {
  const hash = crypto.createHash('sha256').update(data).digest()
  const signature = nacl.crypto_sign_detached(hash, Buffer.from(keypair.privateKey, 'hex'))
  return Buffer.from(signature).toString('hex')
}

const getHash = (data) => {
  const hash = crypto.createHash('sha256').update(data).digest()
  return hash.toString('hex')
}

const generateSecret = () => new Mnemonic(Mnemonic.Words.ENGLISH).toString()

const isValidSecret = secret => Mnemonic.isValid(secret)

const getAddress = publicKey => AschJS.crypto.getAddress(publicKey)

module.exports = {
  getRandomString,
  generateKeyPair,
  sign,
  getHash,
  generateSecret,
  isValidSecret,
  getAddress,
}
