const fs = require('fs')
const crypto = require('crypto')
const aschJS = require('asch-js')
const Api = require('../helpers/api.js')
const blockHelper = require('../helpers/block.js')
const cryptoLib = require('../lib/crypto.js')

let globalOptions

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
    mainnet: !!globalOptions.main,
  })
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2)
}

function openAccount(secret) {
  getApi().post('/api/accounts/open', { secret }, (err, result) => {
    console.log(err || pretty(result.account))
  })
}

function openAccountByPublicKey(publicKey) {
  getApi().post('/api/accounts/open2', { publicKey }, (err, result) => {
    console.log(err || pretty(result.account))
  })
}

function getHeight() {
  getApi().get('/api/blocks/getHeight', (err, result) => {
    console.log(err || result.height)
  })
}

function getBlockStatus() {
  getApi().get('/api/blocks/getStatus', (err, result) => {
    console.log(err || pretty(result))
  })
}

function getBalance(address) {
  const params = { address }
  getApi().get('/api/accounts/getBalance', params, (err, result) => {
    console.log(err || result.balance)
  })
}

function getAccount(address) {
  const params = { address }
  getApi().get('/api/accounts/', params, (err, result) => {
    console.log(err || pretty(result))
  })
}

function getVotedDelegates(address, options) {
  const params = {
    address,
    limit: options.limit,
    offset: options.offset,
  }
  getApi().get('/api/accounts/delegates', params, (err, result) => {
    console.log(err || result)
  })
}

function getDelegates(options) {
  const params = {
    limit: options.limit,
    offset: options.offset,
    orderBy: options.sort || 'rate:asc',
  }
  getApi().get('/api/delegates/', params, (err, result) => {
    console.log(err || pretty(result.delegates))
  })
}

function getDelegatesCount() {
  getApi().get('/api/delegates/count', (err, result) => {
    console.log(err || result.count)
  })
}

function getVoters(publicKey) {
  const params = { publicKey }
  getApi().get('/api/delegates/voters', params, (err, result) => {
    console.log(err || pretty(result.accounts))
  })
}

function getDelegateByPublicKey(publicKey) {
  const params = { publicKey }
  getApi().get('/api/delegates/get', params, (err, result) => {
    console.log(err || pretty(result.delegate))
  })
}

function getDelegateByUsername(username) {
  const params = { username }
  getApi().get('/api/delegates/get', params, (err, result) => {
    console.log(err || pretty(result.delegate))
  })
}

function getBlocks(options) {
  const params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    totalAmount: options.totalAmount,
    totalFee: options.totalFee,
    reward: options.reward,
    generatorPublicKey: options.generatorPublicKey,
  }
  getApi().get('/api/blocks/', params, (err, result) => {
    console.log(err || pretty(result))
  })
}

function getBlockById(id) {
  const params = { id }
  getApi().get('/api/blocks/get', params, (err, result) => {
    console.log(err || pretty(result.block))
  })
}

function getBlockByHeight(height) {
  const params = { height }
  getApi().get('/api/blocks/get', params, (err, result) => {
    console.log(err || pretty(result.block))
  })
}

function getPeers(options) {
  const params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    state: options.state,
    os: options.os,
    port: options.port,
    version: options.version,
  }
  getApi().get('/api/peers/', params, (err, result) => {
    console.log(err || pretty(result.peers))
  })
}

function getUnconfirmedTransactions(options) {
  const params = {
    senderPublicKey: options.key,
    address: options.address,
  }
  getApi().get('/api/transactions/unconfirmed', params, (err, result) => {
    console.log(err || pretty(result.transactions))
  })
}

function getTransactions(options) {
  const params = {
    blockId: options.blockId,
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    type: options.type,
    senderPublicKey: options.senderPublicKey,
    senderId: options.senderId,
    recipientId: options.recipientId,
    amount: options.amount,
    fee: options.fee,
    message: options.message,
  }
  getApi().get('/api/transactions/', params, (err, result) => {
    console.log(err || pretty(result.transactions))
  })
}

function getTransaction(id) {
  const params = { id }
  getApi().get('/api/transactions/get', params, (err, result) => {
    console.log(err || pretty(result.transaction))
  })
}

function sendMoney(options) {
  const trs = aschJS.transaction.createTransactionEx({
    type: 1,
    fee: Number(options.fee) || 10000000,
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: [
      'XAS',
      options.amount,
      options.to,
    ],
  })
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function setName(options) {
  const trs = aschJS.basic.setName(
    options.username,
    options.secret,
    options.secondSecret,
  )
  console.log(JSON.stringify(trs))
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function sendAsset(options) {
  const trs = aschJS.uia.createTransfer(
    options.currency,
    options.amount,
    options.to,
    options.message,
    options.secret,
    options.secondSecret,
  )
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function registerDelegate(options) {
  const trs = aschJS.delegate.createDelegate(
    options.secret,
    options.secondSecret,
  )
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function vote(secret, publicKeys, op, secondSecret) {
  const votes = publicKeys.split(',').map((el) => {
    return op + el
  })
  const trs = aschJS.vote.createVote(
    votes,
    secret,
    secondSecret,
  )
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function listdiffvotes(options) {
  let params = { username: options.username }
  getApi().get('/api/delegates/get', params, (err, result) => {
    const publicKey = result.delegate.publicKey
    let params = {
      address: result.delegate.address,
      limit: options.limit || 101,
      offset: options.offset || 0,
    }
    getApi().get('/api/accounts/delegates', params, (err, result) => {
      var names_a = []
      for (var i = 0; i < result.delegates.length; ++i) {
          names_a[i] = result.delegates[i].username
      }
      var a = new Set(names_a)
      var params = {publicKey: publicKey}
      getApi().get('/api/delegates/voters', params, (err, result) => {
          var names_b = []
          for (var i = 0; i < result.accounts.length; ++i) {
              names_b[i] = result.accounts[i].username
          }
          var b = new Set(names_b)
          var diffab = [...a].filter(x => !b.has(x))
          var diffba = [...b].filter(x => !a.has(x))
          console.log('you voted but doesn\'t vote you: \n\t', JSON.stringify(diffab))
          console.log('\nvoted you but you don\'t voted: \n\t', JSON.stringify(diffba))
      })
    })
  })
}

function upvote(options) {
  vote(options.secret, options.publicKeys, '+', options.secondSecret)
}

function downvote(options) {
  vote(options.secret, options.publicKeys, '-', options.secondSecret)
}

function setSecondSecret(options) {
  const trs = aschJS.signature.createSignature(options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function registerChain(options) {
  if (!options.metafile || !fs.existsSync(options.metafile)) {
    console.error('Error: invalid params, chain meta file must exists')
    return
  }

  const chain = JSON.parse(fs.readFileSync(options.metafile, 'utf8'))
  const trs = aschJS.chain.createChain(chain, options.secret, options.secondSecret)

  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function deposit(options) {
  const trs = aschJS.transfer.createInTransfer(options.chain, options.currency, options.amount, options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function chainTransaction(options) {
  const trs = aschJS.chain.createInnerTransaction({
    fee: options.fee,
    type: Number(options.type),
    args: JSON.parse(options.args)
  }, options.secret)
  getApi().put('/api/chains/' + options.chain + '/transactions/signed', { transaction: trs }, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function transaction(options) {
  const trs = aschJS.transaction.createTransactionEx({
    type: Number(options.type),
    fee: Number(options.fee) || 10000000,
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: JSON.parse(options.args),
  })
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function lock(options) {
  const trs = aschJS.transaction.createLock(options.height, options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, (err, result) => {
    console.log(err || result.transactionId)
  })
}

function getFullBlockById(id) {
  getApi().get('/api/blocks/full?id=' + id, (err, result) => {
    console.log(err || pretty(result.block))
  })
}

function getFullBlockByHeight(height) {
  getApi().get('/api/blocks/full?height=' + height, (err, result) => {
    console.log(err || pretty(result.block))
  })
}

function getTransactionBytes(options) {
  try {
    var trs = JSON.parse(fs.readFileSync(options.file))
  } catch (e) {
    console.log('Invalid transaction format')
    return
  }
  console.log(aschJS.crypto.getBytes(trs, true, true).toString('hex'))
}

function getTransactionId(options) {
  try {
    var trs = JSON.parse(fs.readFileSync(options.file))
  } catch (e) {
    console.log('Invalid transaction format')
    return
  }
  console.log(aschJS.crypto.getId(trs))
}

function getBlockPayloadHash(options) {
  try {
    var block = JSON.parse(fs.readFileSync(options.file))
  } catch (e) {
    console.log('Invalid transaction format')
    return
  }
  var payloadHash = crypto.createHash('sha256')
  for (let i = 0; i < block.transactions.length; ++i) {
    payloadHash.update(aschJS.crypto.getBytes(block.transactions[i]))
  }
  console.log(payloadHash.digest().toString('hex'))
}

function getBlockBytes(options) {
  try {
    var block = JSON.parse(fs.readFileSync(options.file))
  } catch (e) {
    console.log('Invalid transaction format')
    return
  }
  console.log(blockHelper.getBytes(block, true).toString('hex'))
}

function getBlockId(options) {
  try {
    const block = JSON.parse(fs.readFileSync(options.file))
  } catch (e) {
    console.log('Invalid transaction format')
    return
  }
  const bytes = blockHelper.getBytes(block)
  console.log(cryptoLib.getId(bytes))
}

function verifyBytes(options) {
  console.log(aschJS.crypto.verifyBytes(options.bytes, options.signature, options.publicKey))
}

module.exports = (program) => {
  globalOptions = program

  program
    .command('getheight')
    .description('get block height')
    .action(getHeight)

  program
    .command('getblockstatus')
    .description('get block status')
    .action(getBlockStatus)

  program
    .command('openaccount [secret]')
    .description('open your account and get the infomation by secret')
    .action(openAccount)

  program
    .command('openaccountbypublickey [publickey]')
    .description('open your account and get the infomation by publickey')
    .action(openAccountByPublicKey)

  program
    .command('getbalance [address]')
    .description('get balance by address')
    .action(getBalance)

  program
    .command('getaccount [address]')
    .description('get account by address')
    .action(getAccount)

  program
    .command('getvoteddelegates [address]')
    .description('get delegates voted by address')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .action(getVotedDelegates)

  program
    .command('getdelegatescount')
    .description('get delegates count')
    .action(getDelegatesCount)

  program
    .command('getdelegates')
    .description('get delegates')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-s, --sort <field:mode>', 'rate:asc, vote:desc, ...')
    .action(getDelegates)

  program
    .command('getvoters [publicKey]')
    .description('get voters of a delegate by public key')
    .action(getVoters)

  program
    .command('getdelegatebypublickey [publicKey]')
    .description('get delegate by public key')
    .action(getDelegateByPublicKey)

  program
    .command('getdelegatebyusername [username]')
    .description('get delegate by username')
    .action(getDelegateByUsername)

  program
    .command('getblocks')
    .description('get blocks')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-r, --reward <n>', '')
    .option('-f, --totalFee <n>', '')
    .option('-a, --totalAmount <n>', '')
    .option('-g, --generatorPublicKey <publicKey>', '')
    .option('-s, --sort <field:mode>', 'height:asc, totalAmount:asc, totalFee:asc')
    .action(getBlocks)

  program
    .command('getblockbyid [id]')
    .description('get block by id')
    .action(getBlockById)

  program
    .command('getblockbyheight [height]')
    .description('get block by height')
    .action(getBlockByHeight)

  program
    .command('getpeers')
    .description('get peers')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-t, --state <n>', ' 0 ~ 3')
    .option('-s, --sort <field:mode>', '')
    .option('-v, --version <version>', '')
    .option('-p, --port <n>', '')
    .option('--os <os>', '')
    .action(getPeers)

  program
    .command('getunconfirmedtransactions')
    .description('get unconfirmed transactions')
    .option('-k, --key <sender public key>', '')
    .option('-a, --address <address>', '')
    .action(getUnconfirmedTransactions)

  program
    .command('gettransactions')
    .description('get transactions')
    .option('-b, --blockId <id>', '')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option('-t, --type <n>', 'transaction type')
    .option('-s, --sort <field:mode>', '')
    .option('-a, --amount <n>', '')
    .option('-f, --fee <n>', '')
    .option('-m, --message <message>', '')
    .option('--senderPublicKey <key>', '')
    .option('--senderId <id>', '')
    .option('--recipientId <id>', '')
    .action(getTransactions)

  program
    .command('gettransaction [id]')
    .description('get transactions')
    .action(getTransaction)

  program
    .command('sendmoney')
    .description('send money to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-a, --amount <n>', '')
    .option('-f, --fee <n>', '')
    .option('-t, --to <address>', '')
    .option('-m, --message <message>', '')
    .action(sendMoney)

  program
    .command('setname')
    .description('set an username for your address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-u, --username <username>', '')
    .action(setName)

  program
    .command('sendasset')
    .description('send asset to some address')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-c, --currency <currency>', '')
    .option('-a, --amount <amount>', '')
    .option('-t, --to <address>', '')
    .option('-m, --message <message>', '')
    .action(sendAsset)

  program
    .command('registerdelegate')
    .description('register delegate')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .action(registerDelegate)

  program
    .command('listdiffvotes')
    .description('list the votes each other')
    .option('-u, --username <username>', '', process.env.ASCH_USER)
    .action(listdiffvotes)

  program
    .command('upvote')
    .description('vote for delegates')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-p, --publicKeys <public key list>', '')
    .action(upvote)

  program
    .command('downvote')
    .description('cancel vote for delegates')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-p, --publicKeys <public key list>', '')
    .action(downvote)

  program
    .command('setsecondsecret')
    .description('set second secret')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .action(setSecondSecret)

  program
    .command('registerchain')
    .description('register a chain')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-f, --metafile <metafile>', 'chain meta file')
    .action(registerChain)

  program
    .command('deposit')
    .description('deposit assets to an app')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-n, --chain <chain name>', 'chain name that you want to deposit')
    .option('-c, --currency <currency>', 'deposit currency')
    .option('-a, --amount <amount>', 'deposit amount')
    .action(deposit)

  program
    .command('chaintransaction')
    .description('create a chain transaction')
    .option('-e, --secret <secret>', '')
    .option('-n, --chain <chain name>', 'chain name')
    .option('-t, --type <type>', 'transaction type')
    .option('-a, --args <args>', 'json array format')
    .option('-f, --fee <fee>', 'transaction fee')
    .action(chainTransaction)

  program
    .command('lock')
    .description('lock account transfer')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-h, --height <height>', 'lock height')
    .action(lock)

  program
    .command('getfullblockbyid [id]')
    .description('get full block by block id')
    .action(getFullBlockById)

  program
    .command('getfullblockbyheight [height]')
    .description('get full block by block height')
    .action(getFullBlockByHeight)

  program
    .command('gettransactionbytes')
    .description('get transaction bytes')
    .option('-f, --file <file>', 'transaction file')
    .action(getTransactionBytes)

  program
    .command('gettransactionid')
    .description('get transaction id')
    .option('-f, --file <file>', 'transaction file')
    .action(getTransactionId)

  program
    .command('getblockbytes')
    .description('get block bytes')
    .option('-f, --file <file>', 'block file')
    .action(getBlockBytes)

  program
    .command('getblockpayloadhash')
    .description('get block bytes')
    .option('-f, --file <file>', 'block file')
    .action(getBlockPayloadHash)

  program
    .command('getblockid')
    .description('get block id')
    .option('-f, --file <file>', 'block file')
    .action(getBlockId)

  program
    .command('verifybytes')
    .description('verify bytes/signature/publickey')
    .option('-b, --bytes <bytes>', 'transaction or block bytes')
    .option('-s, --signature <signature>', 'transaction or block signature')
    .option('-p, --publicKey <publicKey>', 'signer public key')
    .action(verifyBytes)

  program
    .command('transaction')
    .description('create a transaction in mainchain')
    .option('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .option('-t, --type <type>', 'transaction type')
    .option('-a, --args <args>', 'json array format')
    .option('-m, --message <message>', '')
    .option('-f, --fee <fee>', 'transaction fee')
    .action(transaction)
}
