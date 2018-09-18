const ByteBuffer = require('bytebuffer')

function getTransactionBytes(trs, skipSignature, skipSecondSignature) {
  const bb = new ByteBuffer(1, true)
  bb.writeInt(trs.type)
  bb.writeInt(trs.timestamp)
  bb.writeLong(trs.fee)
  bb.writeString(trs.senderId)

  if (trs.message) bb.writeString(trs.message)
  if (trs.args) {
    let args
    if (Array.isArray(trs.args)) {
      args = JSON.stringify(trs.args)
    } else if (typeof trs.args === 'string') {
      args = trs.args
    } else {
      throw new Error('Invalid transaction args')
    }
    bb.writeString(args)
  }

  if (!skipSignature && trs.signatures) {
    for (const signature of trs.signatures) {
      const signatureBuffer = Buffer.from(signature, 'hex')
      for (let i = 0; i < signatureBuffer.length; i++) {
        bb.writeByte(signatureBuffer[i])
      }
    }
  }

  if (!skipSecondSignature && trs.signSignature) {
    const signSignatureBuffer = Buffer.from(trs.signSignature, 'hex')
    for (let i = 0; i < signSignatureBuffer.length; i++) {
      bb.writeByte(signSignatureBuffer[i])
    }
  }

  bb.flip()

  return bb.toBuffer()
}

module.exports = { getTransactionBytes }
