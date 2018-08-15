const crypto = require('crypto-browserify')
const Mnemonic = require('bitcore-mnemonic')
const AschJS = require('asch-js')
const nacl = require('js-nacl').instantiate()

const randomString = (max) => {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%^&*@'

  for (let i = 0; i < max; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return text
}

const keypair = (secret) => {
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

const getId = (data) => {
  const hash = crypto.createHash('sha256').update(data).digest()
  return hash.toString('hex')
}

const generateSecret = () => new Mnemonic(Mnemonic.Words.ENGLISH).toString()

const isValidSecret = secret => Mnemonic.isValid(secret)

const getAddress = publicKey => AschJS.crypto.getAddress(publicKey)

module.exports = {
  keypair,
  sign,
  getId,
  randomString,
  generateSecret,
  isValidSecret,
  getAddress,
}
