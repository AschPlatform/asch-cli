var fs = require("fs");
var async = require("async");
var accountHelper = require("../helpers/account.js");
var blockHelper = require("../helpers/block.js");
var cryptoLib = require("../lib/crypto.js");
var dappHelper = require("../helpers/dapp.js");
var Api = require('../helpers/api.js');

var globalOptions;

function writeFileSync(file, obj) {
	var content = (typeof obj === "string" ? obj : JSON.stringify(obj, null, 2));
	fs.writeFileSync(file, content, "utf8");
}

function appendFileSync(file, obj) {
	var content = (typeof obj === "string" ? obj : JSON.stringify(obj, null, 2));
	fs.appendFileSync(file, content, "utf8");
}

function genGenesisBlock() {
	var genesisAccount = accountHelper.account(cryptoLib.generateSecret());
	var newBlockInfo = blockHelper.new(genesisAccount);
	var delegateSecrets = newBlockInfo.delegates.map(function(i) {
		return i.secret;
	});
	writeFileSync("./genesisBlock.json", newBlockInfo.block);
	
	var logFile = "./genGenesisBlock.log";
	writeFileSync(logFile, "genesis account:\n");
	appendFileSync(logFile, genesisAccount);
	appendFileSync(logFile, "\ndelegates secrets:\n");
	appendFileSync(logFile, delegateSecrets);
}

function peerstat() {
	var api = new Api({host: globalOptions.host, port: globalOptions.port});
	api.get('/api/peers/', {}, function (err, result) {
    if (err) {
			console.log('Failed to get peers', err);
			return;
		}
		async.mapLimit(result.peers, 10, function (peer, next) {
			new Api({host: peer.ip, port: peer.port}).get('/api/blocks/getHeight', function (err, result) {
				if (err) {
					next(null, {peer: peer, error: err});
				} else {
					next(null, {peer: peer, height: result.height});
				}
			});
		}, function (err, results) {
			var heightMap = {};
			var errorMap = {};
			for (var i = 0; i < results.length; ++i) {
				var item = results[i];
				if (item.error) {
					if (!errorMap[item.error]) {
						errorMap[item.error] = [];
					}
					errorMap[item.error].push(item.peer);
				} else {
					if (!heightMap[item.height]) {
						heightMap[item.height] = [];
					}
					heightMap[item.height].push(item.peer);
				}
			}
			var normalList = [];
			var errList = [];
			for (var k in heightMap) {
				normalList.push({peers: heightMap[k], height: k});
			}
			for (var k in errorMap) {
				errList.push({peers: errorMap[k], error: k});
			}
			normalList.sort(function (l, r) {
				return l.height > r.height;
			});
			
			function joinPeerAddrs(peers) {
				var peerAddrs = [];
				peers.forEach(function (p) {
					peerAddrs.push(p.ip + ':' + p.port);
				});
				return peerAddrs.join(',');
			}
			for (var i = 0; i < normalList.length; ++i) {
				var item = normalList[i];
				if (i == 0) {
					console.log(item.peers.length + ' height: ' + item.height);
				} else {
					console.log(item.height, joinPeerAddrs(item.peers));
				}
			}
			for (var i = 0; i < errList.length; ++i) {
				var item = errList[i];
				console.log(item.peers.length + ' error: ' + item.error, joinPeerAddrs(item.peers));
			}
		});
  });
}


module.exports = function(program) {
	globalOptions = program;

  program
	  .command("creategenesis")
		.description("create genesis block")
		.action(genGenesisBlock);
		
  program
	  .command("peerstat")
		.description("get blockchain of all peers")
		.action(peerstat);
}