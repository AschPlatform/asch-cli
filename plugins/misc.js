var fs = require("fs");
var accountHelper = require("../helpers/account.js");
var blockHelper = require("../helpers/block.js");
var cryptoLib = require("../lib/crypto.js");
var dappHelper = require("../helpers/dapp.js");


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



module.exports = function(program) {
  program
	  .command("creategenesis")
		.description("create genesis block")
		.action(genGenesisBlock);
}