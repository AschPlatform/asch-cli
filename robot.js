var aschJS = require("asch-js");
var Api = require("./helpers/api.js");
var cryptoLib = require("./lib/crypto.js");
var accountHelper = require("./helpers/account.js");

var genesisSecret = "narrow large ribbon hurt leader dream marriage evidence census attack fiction cube";
var api = new Api({host: "45.32.248.33"});

function sendMoney(options, cb) {
  var params = {
    secret: options.secret,
    secondSecret: options.secondSecret,
    recipientId: options.to,
    amount: Number(options.amount)
  };
  api.put('/api/transactions/', params, function (err, result) {
    cb(err || result);
  });
}

function loop(delay) {
  var a = accountHelper.account(cryptoLib.generateSecret());
  var amount = Math.floor(Math.random() * 100) + 1;
  sendMoney({
    to: a.address,
    amount: amount,
    secret: genesisSecret
  }, function (err, result) {
    a.amount = amount;
    a.result = err || result;
    console.log(JSON.stringify(a));
    setTimeout(function () {
      loop(delay);
    }, delay);
  });
}

loop(2000);