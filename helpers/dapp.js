const ByteBuffer = require('bytebuffer')
const crypto = require('crypto')
const cryptoLib = require('../lib/crypto.js')
const dappTransactionsLib = require('../lib/dapptransactions.js')
const account = require('./account.js')

const getBytes = (block, skipSignature) => {
  const size = 8 + 4 + 4 + 4 + 32 + 32 + 8 + 4 + 4 + 64

  const bb = new ByteBuffer(size, true)

  bb.writeString(block.prevBlockId || '0')
  bb.writeLong(block.height)
  bb.writeInt(block.timestamp)
  bb.writeInt(block.payloadLength)

  const ph = Buffer.from(block.payloadHash, 'hex')
  for (let i = 0; i < ph.length; i++) {
    bb.writeByte(ph[i])
  }

  const pb = Buffer.from(block.delegate, 'hex')
  for (let i = 0; i < pb.length; i++) {
    bb.writeByte(pb[i])
  }

  bb.writeString(block.pointId || '0')
  bb.writeLong(block.pointHeight || 0)
  bb.writeInt(block.count)

  if (!skipSignature && block.signature) {
    const ps = Buffer.from(block.signature, 'hex')
    for (let i = 0; i < ps.length; i++) {
      bb.writeByte(pb[i])
    }
  }

  bb.flip()
  return bb.toBuffer()
}

const newDApp = (genesisAccount, assetInfo) => {
  const sender = account.generateAccount(cryptoLib.generateSecret())

  const block = {
    delegate: genesisAccount.keypair.publicKey,
    height: 1,
    pointId: null,
    pointHeight: null,
    transactions: [],
    timestamp: 0,
    payloadLength: 0,
    payloadHash: crypto.createHash('sha256'),
  }

  if (assetInfo) {
    const assetTrs = {
      fee: '0',
      timestamp: 0,
      senderPublicKey: sender.keypair.publicKey,
      type: 3,
      args: [
        assetInfo.name,
        String(Number(assetInfo.amount) * (10 ** assetInfo.precision)),
        genesisAccount.address,
      ],
    }
    bytes = dappTransactionsLib.getTransactionBytes(assetTrs)
    assetTrs.signature = cryptoLib.sign(sender.keypair, bytes)
    block.payloadLength += bytes.length
    block.payloadHash.update(bytes)

    bytes = dappTransactionsLib.getTransactionBytes(assetTrs)
    assetTrs.id = cryptoLib.getHash(bytes)
    block.transactions.push(assetTrs)
  }
  block.count = block.transactions.length

  block.payloadHash = block.payloadHash.digest().toString('hex')
  bytes = getBytes(block)
  block.signature = cryptoLib.sign(genesisAccount.keypair, bytes)
  bytes = getBytes(block)
  block.id = cryptoLib.getHash(bytes)

  return block
}

module.exports = { newDApp }
