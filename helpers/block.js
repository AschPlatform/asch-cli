const crypto = require('crypto')
const fs = require('fs')
const cryptoLib = require('../lib/crypto.js')
const transactionsLib = require('../lib/transactions.js')
const account = require('./account.js')
const ByteBuffer = require('bytebuffer')

const sender = account.generateAccount(cryptoLib.generateSecret())

const getBytes = (block, skipSignature) => {
  const size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64

  const bb = new ByteBuffer(size, true)
  bb.writeInt(block.version)
  bb.writeInt(block.timestamp)
  bb.writeLong(block.height)
  bb.writeInt(block.count)
  bb.writeLong(block.fees)
  bb.writeLong(block.reward)
  bb.writeString(block.delegate)

  if (block.previousBlock) {
    bb.writeString(block.previousBlock)
  } else {
    bb.writeString('0')
  }

  const payloadHashBuffer = Buffer.from(block.payloadHash, 'hex')
  for (let i = 0; i < payloadHashBuffer.length; i++) {
    bb.writeByte(payloadHashBuffer[i])
  }

  if (!skipSignature && block.signature) {
    const signatureBuffer = Buffer.from(block.signature, 'hex')
    for (let i = 0; i < signatureBuffer.length; i++) {
      bb.writeByte(signatureBuffer[i])
    }
  }

  bb.flip()
  return bb.toBuffer()
}

const signTransaction = (trs, keypair) => {
  let bytes = transactionsLib.getTransactionBytes(trs)
  trs.signatures.push(cryptoLib.sign(sender.keypair, bytes))
  bytes = transactionsLib.getTransactionBytes(trs)
  trs.id = cryptoLib.getHash(bytes)
  return trs
}

module.exports = {
  getBytes,
  newBlock: (genesisAccount, dapp, accountsFile) => {
    let payloadHash = crypto.createHash('sha256')
    const transactions = []
    const delegates = []

    // fund recipient account
    if (accountsFile && fs.existsSync(accountsFile)) {
      const lines = fs.readFileSync(accountsFile, 'utf8').split('\n')
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split('\t')
        if (parts.length !== 2) {
          console.error('Invalid recipient balance format')
          process.exit(1)
        }
        const amount = String(Number(parts[1]) * 100000000)
        const trs = {
          type: 1,
          fee: 0,
          timestamp: 0,
          senderId: sender.address,
          senderPublicKey: sender.keypair.publicKey,
          signatures: [],
          message: '',
          args: [Number(amount), parts[0]],
        }

        transactions.push(signTransaction(trs, sender.keypair))
      }
    } else {
      const balanceTransaction = {
        type: 1,
        fee: 0,
        timestamp: 0,
        senderId: sender.address,
        senderPublicKey: sender.keypair.publicKey,
        signatures: [],
        message: '',
        args: [10000000000000000, genesisAccount.address],
      }

      transactions.push(signTransaction(balanceTransaction, sender.keypair))
    }

    // make delegates
    for (let i = 0; i < 101; i++) {
      const delegate = account.generateAccount(cryptoLib.generateSecret())

      const username = `asch_g${i + 1}`
      delegate.name = username
      delegates.push(delegate)

      const nameTrs = {
        type: 2,
        fee: 0,
        timestamp: 0,
        senderId: delegate.address,
        senderPublicKey: delegate.keypair.publicKey,
        signatures: [],
        args: [username],
        message: '',
      }
      const delegateTrs = {
        type: 10,
        fee: 0,
        timestamp: 0,
        senderId: delegate.address,
        senderPublicKey: delegate.keypair.publicKey,
        signatures: [],
        message: '',
      }

      transactions.push(signTransaction(nameTrs, delegate.keypair))
      transactions.push(signTransaction(delegateTrs, delegate.keypair))
    }

    // make votes

    transactions.forEach((tx) => {
      bytes = transactionsLib.getTransactionBytes(tx)
      payloadLength += bytes.length
      payloadHash.update(bytes)
    })

    payloadHash = payloadHash.digest()

    const block = {
      version: 0,
      payloadHash: payloadHash.toString('hex'),
      timestamp: 0,
      previousBlock: null,
      delegate: sender.keypair.publicKey,
      transactions,
      height: 0,
      count: transactions.length,
      fees: 0,
      reward: 0,
    }

    bytes = getBytes(block)
    block.signature = cryptoLib.sign(sender.keypair, bytes)
    bytes = getBytes(block)
    block.id = cryptoLib.getHash(bytes)

    return {
      block,
      delegates,
    }
  },

  from: (genesisBlock, genesisAccount, dapp) => {
    for (let i = 0; i < genesisBlock.transactions.length; i++) {
      const tx = genesisBlock.transactions[i]

      if (tx.type === 5) {
        if (tx.asset.dapp.name === dapp.name) {
          throw new Error(`DApp with name '${dapp.name}' already exists in genesis block`)
        }

        if (tx.asset.dapp.git === dapp.git) {
          throw new Error(`DApp with name '${dapp.git}' already exists in genesis block`)
        }

        if (tx.asset.dapp.link === dapp.link) {
          throw new Error(`DApp with name '${dapp.link}' already exists in genesis block`)
        }
      }
    }

    const dappTransaction = {
      type: 5,
      amount: 0,
      fee: 0,
      timestamp: 0,
      senderId: genesisAccount.address,
      senderPublicKey: genesisAccount.keypair.publicKey,
      asset: {
        dapp,
      },
    }

    let bytes = transactionsLib.getTransactionBytes(dappTransaction)
    dappTransaction.signature = cryptoLib.sign(genesisAccount.keypair, bytes)
    bytes = transactionsLib.getTransactionBytes(dappTransaction)
    dappTransaction.id = cryptoLib.getHash(bytes)

    genesisBlock.payloadLength += bytes.length
    const payloadHash = crypto.createHash('sha256').update(Buffer.from(genesisBlock.payloadHash, 'hex'))
    payloadHash.update(bytes)
    genesisBlock.payloadHash = payloadHash.digest().toString('hex')

    genesisBlock.transactions.push(dappTransaction)
    genesisBlock.numberOfTransactions += 1
    genesisBlock.generatorPublicKey = sender.keypair.publicKey

    bytes = getBytes(genesisBlock)
    genesisBlock.blockSignature = cryptoLib.sign(sender.keypair, bytes)
    bytes = getBytes(genesisBlock)
    genesisBlock.id = cryptoLib.getHash(bytes)

    return {
      block: genesisBlock,
      dapp: dappTransaction,
    }
  },
}
