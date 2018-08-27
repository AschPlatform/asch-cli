var fs = require('fs');
var crypto = require('crypto');
var aschJS = require('asch-js');
var Api = require('../helpers/api.js');
var blockHelper = require('../helpers/block.js');
var cryptoLib = require('../lib/crypto.js');
var querystring = require('querystring');
var globalOptions;

function requestURI(a){
    if( typeof(a) !== 'object' ) 
        return '';
    return '?' + Object.keys(a).map(function(k){ return k + '=' + a[k] }).join('&');
}

function getApi() {
  return new Api({host: globalOptions.host, port: globalOptions.port, mainnet: !!globalOptions.main});
}

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function openAccount(secret) {
  getApi().post('/api/accounts/open', {secret: secret}, function (err, result) {
    console.log(err || pretty(result.account));
  });
}

function openAccountByPublicKey(publicKey) {
  getApi().post('/api/accounts/open2', {publicKey: publicKey}, function (err, result) {
    console.log(err || pretty(result.account));
  });
}

function getHeight() {
  getApi().get('/api/blocks/getHeight', function (err, result) {
    console.log(err || result.height);
  });
}

function getBlockStatus() {
  getApi().get('/api/blocks/getStatus', function (err, result) {
    console.log(err || pretty(result));
  });
}

function getBalance(address) {
  getApi().get('/api/v2/accounts/' + address, null, function (err, result) {
    console.log(err || result.account.xas);
  });
}

function getAccount(address) {
  getApi().get('/api/v2/accounts/' + address, null, function (err, result) {
    console.log(err || pretty(result));
  });
} 

function getVotedDelegates(address, options) {
  var params = {
    address: address,
    limit: options.limit,
    offset: options.offset
  };
  getApi().get('/api/accounts/delegates', params, function (err, result) {
    console.log(err || result);
  });
}

function getDelegates(options) {
  var params = {
    limit: options.limit,
    offset: options.offset,
    orderBy: options.sort || "rate:asc"
  };
  getApi().get('/api/delegates/', params, function (err, result) {
    console.log(err || pretty(result.delegates));
  });
}

function getDelegatesCount() {
  getApi().get('/api/delegates/count', function (err, result) {
    console.log(err || result.count);
  });
}

function getVoters(publicKey) {
  var params = {publicKey: publicKey};
  getApi().get('/api/delegates/voters', params, function (err, result) {
    console.log(err || pretty(result.accounts));
  });
}

function getDelegateByPublicKey(publicKey) {
  var params = {publicKey: publicKey};
  getApi().get('/api/delegates/get', params, function (err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getDelegateByUsername(username) {
  var params = {username: username};
  getApi().get('/api/delegates/get', params, function (err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getBlocks(options) {
  let request = querystring.stringify(options);
  getApi().get('/api/v2/blocks/?' + request, null, function (err, result) {
    console.log(err || pretty(result));
  });
}

function getBlockById(id) {
  getApi().get('/api/v2/blocks/' + id, null, function (err, result) {
    console.log(err || pretty(result.block));
  });
}

function getBlockByHeight(height) {
  getApi().get('/api/v2/blocks/' + height, null, function (err, result) {
    console.log(err || pretty(result.block));
  });
}

function getPeers(options) {
  var params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    state: options.state,
    os: options.os,
    port: options.port,
    version: options.version
  };
  // var liskOptions = {host:'login.lisk.io', port:80};
  getApi().get('/api/peers/', params, function (err, result) {
    console.log(err || pretty(result.peers));
  });
}

function getUnconfirmedTransactions(options) {
  var params = {
    senderPublicKey: options.key,
    address: options.address
  };
  getApi().get('/api/transactions/unconfirmed', params, function (err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransactions(options) {
  let request = querystring.stringify(options);
  getApi().get('/api/v2/transactions?' + request, null, function (err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransaction(id) {
  var params = {id: id};
  getApi().get('/api/v2/transactions/' + id, null, function (err, result) {
    console.log(err || pretty(result.transaction));
  });
}

function sendMoney(options) {
  // var params = {
  //   secret: options.secret,
  //   secondSecret: options.secondSecret,
  //   recipientId: options.to,
  //   amount: Number(options.amount)
  // };
  // getApi().put('/api/transactions/', params, function (err, result) {
  //   console.log(err || result);
  // });
  var trs = aschJS.transaction.createTransactionEx({
    type: 1,
    fee: Number(options.fee) || 10000000, 
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: [
      Number(options.amount),
      options.to
    ]
  });
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function setName(options) {
  var trs = aschJS.basic.setName(
    options.username,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function sendAsset(options) {
  var trs = aschJS.uia.createTransfer(
    options.currency,
    options.amount,
    options.to,
    options.message,
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function registerDelegate(options) {
  // var params = {
  //   secret: options.secret,
  //   username: options.username,
  //   secondSecret: options.secondSecret,
  // };
  // getApi().put('/api/delegates/', params, function (err, result) {
  //   console.log(err || result);
  // });
  var trs = aschJS.delegate.createDelegate(
    options.secret,
    options.secondSecret
  );
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function vote(secret, publicKeys, op, secondSecret) {
  var votes = publicKeys.split(',').map(function (el) {
    return op + el;
  });
  var trs = aschJS.vote.createVote(
    votes,
    secret,
    secondSecret
  );
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function listdiffvotes(options) {
    var params = {username: options.username};
    getApi().get('/api/delegates/get', params, function (err, result) {
        var publicKey = result.delegate.publicKey;
        var params = {
          address: result.delegate.address,
          limit: options.limit || 101,
          offset: options.offset || 0,
        };
        getApi().get('/api/accounts/delegates', params, function (err, result) {
            var names_a = [];
            for (var i = 0; i < result.delegates.length; ++i) {
                names_a[i] = result.delegates[i].username;
            }
            var a = new Set(names_a);
            var params = {publicKey: publicKey};
            getApi().get('/api/delegates/voters', params, function (err, result) {
                var names_b = [];
                for (var i = 0; i < result.accounts.length; ++i) {
                    names_b[i] = result.accounts[i].username;
                }
                var b = new Set(names_b);
                var diffab = [...a].filter(x => !b.has(x));
                var diffba = [...b].filter(x => !a.has(x));
                console.log('you voted but doesn\'t vote you: \n\t', JSON.stringify(diffab));
                console.log('\nvoted you but you don\'t voted: \n\t', JSON.stringify(diffba));
            });
        });
    });
}

function upvote(options) {
  vote(options.secret, options.publicKeys, '+', options.secondSecret);
}

function downvote(options) {
  vote(options.secret, options.publicKeys, '-', options.secondSecret);
}

function setSecondSecret(options) {
  var trs = aschJS.signature.createSignature(options.secret, options.secondSecret);
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function registerChain(options) {
  if (!options.metafile || !fs.existsSync(options.metafile)) {
    console.error("Error: invalid params, chain meta file must exists");
    return;
  }

  var chain = JSON.parse(fs.readFileSync(options.metafile, 'utf8'));
  var trs = aschJS.chain.createChain(chain, options.secret, options.secondSecret);

  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function deposit(options) {
  var trs = aschJS.transfer.createInTransfer(options.chain, options.currency, options.amount, options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function chainTransaction(options) {
  var trs = aschJS.chain.createInnerTransaction({
    fee: options.fee,
    type: Number(options.type),
    args: JSON.parse(options.args)
  }, options.secret)
  getApi().put('/api/chains/' + options.chain + '/transactions/signed', { transaction: trs }, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function transaction(options) {
  var trs = aschJS.transaction.createTransactionEx({
    type: Number(options.type),
    fee: Number(options.fee) || 10000000, 
    message: options.message,
    secret: options.secret,
    secondSecret: options.secondSecret,
    args: JSON.parse(options.args)
  })
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

/* function propose(options) {
  var trs = aschJS.proposal.propose({
    title: options.title, 
    desc: options.desc,
    endHeight: options.endHeight
   },options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
} */

function registergateway(options) {
  var trs = aschJS.proposal.registergateway({
    title: options.title, 
    desc: options.desc,
    endHeight: Number(options.endHeight),
    name: options.name,
    symbol: options.symbol,
    currencyDesc: options.currencyDesc,
    precision: options.precision || 8,
    minimumMembers: options.minimumMembers || 3,
    updateInterval: options.updateInterval || 8640
   },options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}activateproposal

function activateproposal(options) {
  var trs = aschJS.proposal.activate({
    tid: options.tid
   },options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function initgateway(options) {
  var trs = aschJS.proposal.initgateway({
    name: options.name,
    members: JSON.parse('[' + options.members.split(',').map(function(word){
    return '"' + word.trim() + '"';
}).join(',')
 +']')
   },options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function registermember(options) {
  var trs = aschJS.gateway.registerMember({
    gateway: options.gateway
   },options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function lock(options) {
  var trs = aschJS.transaction.createLock(options.height, options.secret, options.secondSecret)
  getApi().broadcastTransaction(trs, function (err, result) {
    console.log(err || result.transactionId)
  });
}

function getFullBlockById(id) {
  getApi().get('/api/blocks/full?id=' + id, function (err, result) {
    console.log(err || pretty(result.block))
  })
}

function getFullBlockByHeight(height) {
  getApi().get('/api/blocks/full?height=' + height, function (err, result) {
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
  var payloadHash = crypto.createHash('sha256');
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
    var block = JSON.parse(fs.readFileSync(options.file))
  } catch (e) {
    console.log('Invalid transaction format')
    return
  }
  var bytes = blockHelper.getBytes(block)
  console.log(cryptoLib.getId(bytes))
}

function verifyBytes(options) {
  console.log(aschJS.crypto.verifyBytes(options.bytes, options.signature, options.publicKey))
}

module.exports = function(program) {
  globalOptions = program;
  
  program
    .command("getheight")
    .description("get block height")
    .action(getHeight);
    
 program
    .command("getblockstatus")
    .description("get block status")
    .action(getBlockStatus);   
  
 program
   .command("openaccount [secret]")
   .description("open your account and get the infomation by secret")
   .action(openAccount);

  program
    .command("openaccountbypublickey [publickey]")
    .description("open your account and get the infomation by publickey")
    .action(openAccountByPublicKey);

  program
    .command("getbalance [address]")
    .description("get balance by address")
    .action(getBalance);
    
  program
    .command("getaccount [address]")
    .description("get account by address")
    .action(getAccount);
     
  program
    .command("getvoteddelegates [address]")
    .description("get delegates voted by address")
    .option("-o, --offset <n>", "")
    .option("-l, --limit <n>", "")
    .action(getVotedDelegates);
    
  program
    .command("getdelegatescount")
    .description("get delegates count")
    .action(getDelegatesCount);
    
  program
    .command("getdelegates")
    .description("get delegates")
    .option("-o, --offset <n>", "")
    .option("-l, --limit <n>", "")
    .option("-s, --sort <field:mode>", "rate:asc, vote:desc, ...")
    .action(getDelegates);
    
  program
    .command("getvoters [publicKey]")
    .description("get voters of a delegate by public key")
    .action(getVoters);
    
  program
    .command("getdelegatebypublickey [publicKey]")
    .description("get delegate by public key")
    .action(getDelegateByPublicKey);

  program
    .command("getdelegatebyusername [username]")
    .description("get delegate by username")
    .action(getDelegateByUsername);
    
  program
    .command("getblocks")
    .description("get blocks")
    .option("-o, --offset <n>", "")
    .option("-l, --limit <n>", "")
    .option("-t, --transactions <boolean>", "If this keyword is added with transactions=true then the block will be accompanied by transaction information")
    .option("-s, --orderBy <field:mode>", "height:asc, totalAmount:asc, totalFee:asc")
    .action(getBlocks);
    
  program
    .command("getblockbyid [id]")
    .description("get block by id")
    .action(getBlockById);
    
  program
    .command("getblockbyheight [height]")
    .description("get block by height")
    .action(getBlockByHeight);
    
  program
    .command("getpeers")
    .description("get peers")
    .option("-o, --offset <n>", "")
    .option("-l, --limit <n>", "")
    .option("-t, --state <n>", " 0 ~ 3")
    .option("-s, --sort <field:mode>", "")
    .option("-v, --version <version>", "")
    .option("-p, --port <n>", "")
    .option("--os <os>", "")
    .action(getPeers);
    
  program
    .command("getunconfirmedtransactions")
    .description("get unconfirmed transactions")
    .option("-k, --key <sender public key>", "")
    .option("-a, --address <address>", "")
    .action(getUnconfirmedTransactions);

  program
    .command("gettransactions")
    .description("get transactions")
    .option("-o, --offset <n>", "")
    .option("-l, --limit <n>", "")
    .option("-t, --type <n>", "transaction type")
    .option("-s, --orderBy <field:mode>", "Sort by")
    .option("-m, --message <message>", "")
    .option("--senderId <id>", "")
    .action(getTransactions);
    
  program
    .command("gettransaction [id]")
    .description("get transactions")
    .action(getTransaction);
    
  program
    .command("sendmoney")
    .description("send money to some address")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-a, --amount <n>", "")
    .option("-f, --fee <n>", "")
    .option("-t, --to <address>", "")
    .option("-m, --message <message>", "")
    .action(sendMoney);

  program
    .command("setname")
    .description("set an username for your address")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-u, --username <username>", "")
    .action(setName);
  
  program
    .command("sendasset")
    .description("send asset to some address")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-c, --currency <currency>", "")
    .option("-a, --amount <amount>", "")
    .option("-t, --to <address>", "")
    .option("-m, --message <message>", "")
    .action(sendAsset);
  
  program
    .command("registerdelegate")
    .description("register delegate")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .action(registerDelegate);
    
  program
    .command("listdiffvotes")
    .description("list the votes each other")
    .option("-u, --username <username>", "", process.env.ASCH_USER)
    .action(listdiffvotes);

  program
    .command("upvote")
    .description("vote for delegates")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-p, --publicKeys <public key list>", "")
    .action(upvote);
    
  program
    .command("downvote")
    .description("cancel vote for delegates")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-p, --publicKeys <public key list>", "")
    .action(downvote);
    
  program
    .command("setsecondsecret")
    .description("set second secret")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .action(setSecondSecret);
    
  program
    .command("registerchain")
    .description("register a chain")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-f, --metafile <metafile>", "chain meta file")
    .action(registerChain);
  
  program
    .command("deposit")
    .description("deposit assets to an app")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-n, --chain <chain name>", "chain name that you want to deposit")
    .option("-c, --currency <currency>", "deposit currency")
    .option("-a, --amount <amount>", "deposit amount")
    .action(deposit);

  program
    .command("chaintransaction")
    .description("create a chain transaction")
    .option("-e, --secret <secret>", "")
    .option("-n, --chain <chain name>", "chain name")
    .option("-t, --type <type>", "transaction type")
    .option("-a, --args <args>", "json array format")
    .option("-f, --fee <fee>", "transaction fee")
    .action(chainTransaction);

  program
    .command("lock")
    .description("lock account transfer")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-h, --height <height>", "lock height")
    .action(lock);

  program
    .command("getfullblockbyid [id]")
    .description("get full block by block id")
    .action(getFullBlockById);
  
  program
    .command("getfullblockbyheight [height]")
    .description("get full block by block height")
    .action(getFullBlockByHeight);

  program
    .command("gettransactionbytes")
    .description("get transaction bytes")
    .option("-f, --file <file>", "transaction file")
    .action(getTransactionBytes)
  
  program
    .command("gettransactionid")
    .description("get transaction id")
    .option("-f, --file <file>", "transaction file")
    .action(getTransactionId)
  
  program
    .command("getblockbytes")
    .description("get block bytes")
    .option("-f, --file <file>", "block file")
    .action(getBlockBytes)
  
  program
    .command("getblockpayloadhash")
    .description("get block bytes")
    .option("-f, --file <file>", "block file")
    .action(getBlockPayloadHash)
  
  program
    .command("getblockid")
    .description("get block id")
    .option("-f, --file <file>", "block file")
    .action(getBlockId)
  
  program
    .command("verifybytes")
    .description("verify bytes/signature/publickey")
    .option("-b, --bytes <bytes>", "transaction or block bytes")
    .option("-s, --signature <signature>", "transaction or block signature")
    .option("-p, --publicKey <publicKey>", "signer public key")
    .action(verifyBytes)

  program
    .command("transaction")
    .description("create a transaction in mainchain")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-t, --type <type>", "transaction type")
    .option("-a, --args <args>", "json array format")
    .option("-m, --message <message>", "")
    .option("-f, --fee <fee>", "transaction fee")
    .action(transaction);

/* Only proposals with a type (topic) set can be done  
  program
    .command("propose")
    .description("propose a proposal")
    .option("-e, --secret <secret>", "")
    .option("-t, --title <title>", "Title of the proposal (10-100 chars)") 
    .option("-d, --desc <description>", "Description of the proposal") 
    .option("-h, --endHeight <height>", "Proposal end date")
    .action(propose);
*/

  program
    .command("registergateway")
    .description("register a gateway")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-t, --title <title>", "Title of the Gateway (10-100 chars)") 
    .option("-d, --desc <description>", "Description of the Gateway") 
    .option("-h, --endHeight <height>", "Proposal end date")
    .option("-n, --name <name>", "Name of the currency (3-16 uppercase and lowercase chars)")
    .option("-s, --symbol <symbol>", "Howto call the issued currency")
    .option("-c, --currencyDesc <Description>", "description of the currency")
    .option("-p, --precision <precision>", "precision of the currency")
    .option("-m, --minimumMembers <minimumMembers>", "The minimum number of members of the gateway, the range of this value should be an integer between 3-33")
    .option("-u, --updateInterval <updateInterval>", "update frequency, this value Should be greater than or equal to 8640") 
    .action(registergateway);

  program
    .command("activateproposal")
    .description("activate a proposal")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-t, --tid <tid>", "The tid of the proposal")
    .action(activateproposal);

  program
    .command("initgateway")
    .description("register a gateway")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-n, --name <name>", "Name of the currency / gateway (3-16 uppercase and lowercase chars)")
    .option("-m, --members <addressMember1, addressMember2, addressMember3, ...>", "csv list of the member addresses")
    .action(initgateway);

  program
    .command("registermember")
    .description("register a member for a gateway")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-g, --gateway <gateway>", "the name of the gateway")
    .action(registermember);
}
