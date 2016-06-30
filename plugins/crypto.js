var inquirer = require("inquirer");
var cryptoLib = require("../lib/crypto.js");
var accountHelper = require("../helpers/account.js");

function genPubkey() {
	inquirer.prompt([
		{
			type: "password",
			name: "secret",
			message: "Enter secret of your testnet account",
			validate: function (value) {
				var done = this.async();

				if (value.length == 0) {
					done("Secret is too short, minimum is 1 character");
					return;
				}

				if (value.length > 100) {
					done("Secret is too long, maximum is 100 characters");
					return;
				}
				
				done(true);
			}
		}
	], function (result) {
		var account = accountHelper.account(result.secret.trim());
		console.log("Public key: " + account.keypair.publicKey);
		console.log("Address: " + account.address);
	});
}

function genAccount() {
	inquirer.prompt([
		{
			type: "input",
			name: "amount",
			message: "Enter number of accounts to generate",
			validate: function (value) {
				var num = parseInt(value);
				return !isNaN(num);
			}
		}
	], function (result) {
		var n = parseInt(result.amount);
		var accounts = [];

		for (var i = 0; i < n; i++) {
			var a = accountHelper.account(cryptoLib.generateSecret());
			accounts.push({
				address: a.address,
				secret: a.secret,
				publicKey: a.keypair.publicKey
			});
		}
		console.log(accounts);
		console.log("Done");
	});
}

module.exports = function (program) {
  program
		.command("crypto")
		.description("crypto operations")
		.option("-p, --pubkey", "generate public key from secret")
		.option("-g, --generate", "generate random accounts")
		.action(function (options) {
			if (options.pubkey) {
				genPubkey();
			} else if (options.generate) {
				genAccount();
			} else {
				console.log("'node crypto -h' to get help");
			}
		});
}