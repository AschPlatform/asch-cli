var Api = require('../helpers/api.js');
var aschJS = require('asch-js');

var api = new Api();

function pretty(obj) {
  return JSON.stringify(obj, null, 2);
}

function openAccount(secret) {
  api.post('/api/accounts/open', {secret: secret}, function (err, result) {
    console.log(err || pretty(result.account));
  });
}

function openAccountByPublicKey(publicKey) {
  api.post('/api/accounts/open2', {publicKey: publicKey}, function (err, result) {
    console.log(err || pretty(result.account));
  });
}

function getHeight() {
  api.get('/api/blocks/getHeight', function (err, result) {
    console.log(err || result.height);
  });
}

function getBlockStatus() {
  api.get('/api/blocks/getStatus', function (err, result) {
    console.log(err || pretty(result));
  });
}

function getBalance(address) {
  var params = {address: address};
  api.get('/api/accounts/getBalance', params, function (err, result) {
    console.log(err || result.balance);
  });
}

function getAccount(address) {
  var params = {address: address};
  api.get('/api/accounts/', params, function (err, result) {
    console.log(err || pretty(result.account));
  });
}

function getVotedDelegates(address, options) {
  var params = {
    address: address,
    limit: options.limit,
    offset: options.offset
  };
  api.get('/api/accounts/delegates', params, function (err, result) {
    console.log(err || result);
  });
}

function getDelegates(options) {
  var params = {
    limit: options.limit,
    offset: options.offset,
    orderBy: options.sort || "rate:asc"
  };
  api.get('/api/delegates/', params, function (err, result) {
    console.log(err || pretty(result.delegates));
  });
}

function getDelegatesCount() {
  api.get('/api/delegates/count', function (err, result) {
    console.log(err || result.count);
  });
}

function getVoters(publicKey) {
  var params = {publicKey: publicKey};
  api.get('/api/delegates/voters', params, function (err, result) {
    console.log(err || pretty(result.accounts));
  });
}

function getDelegateByPublicKey(publicKey) {
  var params = {publicKey: publicKey};
  api.get('/api/delegates/get', params, function (err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getDelegateByUsername(username) {
  var params = {username: username};
  api.get('/api/delegates/get', params, function (err, result) {
    console.log(err || pretty(result.delegate));
  });
}

function getBlocks(options) {
  var params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    totalAmount: options.totalAmount,
    totalFee: options.totalFee,
    reward: options.reward
  };
  api.get('/api/blocks/', params, function (err, result) {
    console.log(err || pretty(result));
  });
}

function getBlockById(id) {
  var params = {id: id};
  api.get('/api/blocks/get', params, function (err, result) {
    console.log(err || pretty(result.block));
  });
}

function getBlockByHeight(height) {
  var params = {height: height};
  api.get('/api/blocks/get', params, function (err, result) {
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
  api.get('/api/peers/', params, function (err, result) {
    console.log(err || pretty(result.peers));
  });
}

function getUnconfirmedTransactions(options) {
  var params = {
    senderPublicKey: options.key,
    address: options.address
  };
  api.get('/api/transactions/unconfirmed', params, function (err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransactions(options) {
  var params = {
    blockId: options.blockId,
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
    type: options.type,
    senderPublicKey: options.senderPublicKey,
    senderId: options.senderId,
    recipientId: options.recipientId,
    amount: options.amount,
    fee: options.fee
  };
  api.get('/api/transactions/', params, function (err, result) {
    console.log(err || pretty(result.transactions));
  });
}

function getTransaction(id) {
  var params = {id: id};
  api.get('/api/transactions/get', params, function (err, result) {
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
  // api.put('/api/transactions/', params, function (err, result) {
  //   console.log(err || result);
  // });
  var trs = aschJS.transaction.createTransaction(
    options.to,
    options.amount * 100000000,
    options.secret,
    options.secondSecret
  );
  api.broadcastTransaction(trs, function (err, result) {
    console.log(err || result.success);
  });
}

function registerDelegate(options) {
  // var params = {
  //   secret: options.secret,
  //   username: options.username,
  //   secondSecret: options.secondSecret,
  // };
  // api.put('/api/delegates/', params, function (err, result) {
  //   console.log(err || result);
  // });
  var trs = aschJS.delegate.createDelegate(
    options.secret,
    options.username,
    options.secondSecret
  );
  api.broadcastTransaction(trs, function (err, result) {
    console.log(err || result.success);
  });
}

function vote(secret, publicKeys, op, secondSecret) {
  var votes = publicKeys.split(',').map(function (el) {
    return op + el;
  });
  var trs = aschJS.vote.createVote(
    secret,
    votes,
    secondSecret
  );
  api.broadcastTransaction(trs, function (err, result) {
    console.log(err || result.success);
  });
}

function upvote(options) {
  vote(options.secret, options.publicKeys, '+', options.secondSecret);
}

function downvote(options) {
  vote(options.secret, options.publicKeys, '-', options.secondSecret);
}

module.exports = function(program) {
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
    .option("-r, --reward <n>", "")
    .option("-f, --totalFee <n>", "")
    .option("-a, --totalAmount <n>", "")
    .option("-s, --sort <field:mode>", "height:asc, totalAmount:asc, totalFee:asc")
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
    .option("-b, --blockId <id>", "")
    .option("-o, --offset <n>", "")
    .option("-l, --limit <n>", "")
    .option("-t, --type <n>", "transaction type")
    .option("-s, --sort <field:mode>", "")
    .option("-a, --amount <n>", "")
    .option("-f, --fee <n>", "")
    .option("--senderPublicKey <key>", "")
    .option("--senderId <id>", "")
    .option("--recipientId <id>", "")
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
    .option("-t, --to <address>", "")
    .action(sendMoney);
  
  program
    .command("registerdelegate")
    .description("register delegate")
    .option("-e, --secret <secret>", "")
    .option("-s, --secondSecret <secret>", "")
    .option("-u, --username <username>", "")
    .action(registerDelegate);
    
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
}