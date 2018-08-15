const assert = require('assert')
const ByteBuffer = require('bytebuffer')

function getTransactionBytes(trs, skipSignature) {
  try {
    const bb = new ByteBuffer(1, true)
    bb.writeInt(trs.timestamp)
    bb.writeString(trs.fee)

    const senderPublicKeyBuffer = Buffer.from(trs.senderPublicKey, 'hex')
    for (let i = 0; i < senderPublicKeyBuffer.length; i++) {
      bb.writeByte(senderPublicKeyBuffer[i])
    }

    bb.writeInt(trs.type)

    assert(Array.isArray(trs.args))
    bb.writeString(JSON.stringify(trs.args))

    if (!skipSignature && trs.signature) {
      const signatureBuffer = Buffer.from(trs.signature, 'hex')
      for (let i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i])
      }
    }

    bb.flip()
  } catch (e) {
    throw Error(e.toString())
  }
  return bb.toBuffer()
}

module.exports = { getTransactionBytes }
