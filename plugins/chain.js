
var inquirer = require("inquirer");
var gift = require("gift");
var fs = require("fs");
var shell = require("shelljs");
var async = require('async');
var path = require("path");
var request = require("request");
var valid_url = require("valid-url");
var AschJS = require('asch-js');
var accountHelper = require("../helpers/account.js");
var blockHelper = require("../helpers/block.js");
var dappHelper = require("../helpers/dapp.js");
var Api = require("../helpers/api.js");

var templatePath = path.join(__dirname, "..", "template");

function bip39Validator(input) {
	var done = this.async();

	if (!accountHelper.isValidSecret(input)) {
		done("Secret is not validated by BIP39");
		return;
	}

	done(null, true);
}

function assetNameValidator(input) {
	let done = this.async()
	if (!input || !/^[A-Z]{3,6}$/.test(input)) {
		return done('Invalid currency symbol')
	}
	done(null, true)
}

function amountValidator(input) {
	let done = this.async()
	if (!/^[1-9][0-9]*$/.test(input)) {
		return done('Amount should be integer')
	}
	done(null, true)
}

function precisionValidator(input) {
	let done = this.async()
	let precision = Number(input)
	if (!Number.isInteger(precision) || precision < 0 || precision > 16) {
		return done('Precision is between 0 and 16')
	}
	done(null, true)
}

async function prompt(question) {
	if (Array.isArray(question)) {
		return await inquirer.prompt(question)
	} else {
		let answer = await inquirer.prompt([question])
		return answer[question.name]
	}
}

async function createChainMetaFile() {
	let answer = await prompt([
		{
			type: "input",
			name: "name",
			message: "Enter chain name",
			required: true,
			validate: function (value) {
				var done = this.async();
				if (value.length == 0) {
					done("Chain name is too short, minimum is 1 character");
					return;
				}
				if (value.length > 32) {
					done("Chain name is too long, maximum is 32 characters");
					return;
				}
				return done(null, true)
			}
		},
		{
			type: "input",
			name: "desc",
			message: "Enter chain description",
			validate: function (value) {
				var done = this.async();

				if (value.length > 160) {
					done("Chain description is too long, maximum is 160 characters");
					return;
				}

				return done(null, true);
			}
		},
		{
			type: "input",
			name: "link",
			message: "Enter chain link",
			required: true,
			validate: function (value) {
				var done = this.async();

				if (!valid_url.isUri(value)) {
					done("Invalid chain link, must be a valid url");
					return;
				}
				if (value.indexOf(".zip") != value.length - 4) {
					done("Invalid chain link, does not link to zip file");
					return;
				}
				if (value.length > 160) {
					return done("Chain link is too long, maximum is 160 characters");
				}

				return done(null, true);
			}
		},
		{
			type: "input",
			name: "icon",
			message: "Enter chain icon url",
			validate: function (value) {
				var done = this.async();

				if (!valid_url.isUri(value)) {
					return done("Invalid chain icon, must be a valid url");
				}
				var extname = path.extname(value);
				if (['.png', '.jpg', '.jpeg'].indexOf(extname) == -1) {
					return done("Invalid chain icon file type");
				}
				if (value.length > 160) {
					return done("Chain icon url is too long, maximum is 160 characters");
				}

				return done(null, true);
			}
		},
		{
			type: "input",
			name: "delegates",
			message: "Enter public keys of chain delegates - hex array, use ',' for separator",
			validate: function (value) {
				var done = this.async();

				var publicKeys = value.split(",");

				if (publicKeys.length == 0) {
					done("Chain requires at least 1 delegate public key");
					return;
				}

				for (var i in publicKeys) {
					try {
						var b = new Buffer(publicKeys[i], "hex");
						if (b.length != 32) {
							done("Invalid public key: " + publicKeys[i]);
							return;
						}
					} catch (e) {
						done("Invalid hex for public key: " + publicKeys[i]);
						return;
					}
				}
				done(null, true);
			}
		},
		{
			type: "input",
			name: "unlockDelegates",
			message: "How many delegates are needed to unlock asset of a chain?",
			validate: function (value) {
				var done = this.async();
				var n = Number(value);
				if (!Number.isInteger(n) || n < 3 || n > 101) {
					return done("Invalid unlockDelegates");
				}
				done(null, true);
			}
		}
	])
	var chainMetaInfo = {
		name: answer.name,
		link: answer.link,
		desc: answer.desc || "",
		icon: answer.icon || "",
		delegates: answer.delegates.split(","),
		unlockDelegates: Number(answer.unlockDelegates)
	}
	var chainMetaJson = JSON.stringify(chainMetaInfo, null, 2);
	fs.writeFileSync("./chain.json", chainMetaJson, "utf8");
	console.log("Chain meta information is saved to ./chain.json ...");
}

async function createChain() {
	console.log('Copying template to the current directory ...')
	shell.cp('-R', templatePath + '/*', '.')
	await createChainMetaFile()
}

async function depositChain() {
	let result = await inquirer.prompt([
		{
			type: "password",
			name: "secret",
			message: "Enter secret",
			validate: bip39Validator,
			required: true
		},
		{
			type: "input",
			name: "amount",
			message: "Enter amount",
			validate: function (value) {
				return !isNaN(parseInt(value));
			},
			required: true
		},
		{
			type: "input",
			name: "chain",
			message: "chain name",
			required: true
		},
		{
			type: "input",
			name: "secondSecret",
			message: "Enter secondary secret (if defined)",
			validate: function (message) {
				return message.length < 100;
			},
			required: false
		}
	]);


	var realAmount = parseFloat((parseInt(result.amount) * 100000000).toFixed(0));
	var body = {
		secret: result.secret,
		chain: result.chain,
		amount: realAmount
	};

	if (result.secondSecret && result.secondSecret.length > 0) {
		body.secondSecret = result.secondSecret;
	}

	let hostResult = await inquirer.prompt([
		{
			type: "input",
			name: "host",
			message: "Host and port",
			default: "localhost:4096",
			required: true
		}
	]);

	request({
		url: "http://" + hostResult.host + "/api/chains/transaction",
		method: "put",
		json: true,
		body: body
	}, function (err, resp, body) {

		if (err) {
			return console.log(err.toString());
		}

		if (body.success) {
			console.log(body.transactionId);
			return;
		} else {
			return console.log(body.error);
		}
	});
}

async function withdrawalChain() {
	let result = await inquirer.prompt([
		{
			type: "password",
			name: "secret",
			message: "Enter secret",
			validate: bip39Validator,
			required: true
		},
		{
			type: "input",
			name: "amount",
			message: "Amount",
			validate: function (value) {
				return !isNaN(parseInt(value));
			},
			required: true
		},
		{
			type: "input",
			name: "chain",
			message: "Enter chain name",
			validate: function (value) {
				var isAddress = /^[0-9]+$/g;
				return isAddress.test(value);
			},
			required: true
		}]);

	var body = {
		secret: result.secret,
		amount: Number(result.amount)
	};

	request({
		url: "http://localhost:4096/api/chains/" + result.chain + "/api/withdrawal",
		method: "post",
		json: true,
		body: body
	}, function (err, resp, body) {
		if (err) {
			return console.log(err.toString());
		}

		if (body.success) {
			console.log(body.transactionId);
		} else {
			return console.log(body.error);
		}
	});
}

async function uninstallChain() {
	let result = await inquirer.prompt([
		{
			type: "input",
			name: "chain",
			message: "Enter chain name",
			validate: function (value) {
				return value.length > 0 && value.length < 100;
			},
			required: true
		},
		{
			type: "input",
			name: "host",
			message: "Host and port",
			default: "localhost:4096",
			required: true
		},
		{
			type: "password",
			name: "masterpassword",
			message: "Enter chain master password",
			required: true
		}]);

	var body = {
		id: String(result.chain),
		master: String(result.masterpassword)
	};

	request({
		url: "http://" + result.host + "/api/chains/uninstall",
		method: "post",
		json: true,
		body: body
	}, function (err, resp, body) {
		if (err) {
			return console.log(err.toString());
		}

		if (body.success) {
			console.log("Done!");
		} else {
			return console.log(body.error);
		}
	});
}

async function installChain() {
	let result = await inquirer.prompt([
		{
			type: "input",
			name: "chain",
			message: "Enter chain name",
			validate: function (value) {
				return value.length > 0 && value.length < 100;
			},
			required: true
		},
		{
			type: "input",
			name: "host",
			message: "Host and port",
			default: "localhost:4096",
			required: true
		},
		{
			type: "input",
			name: "masterpassword",
			message: "Enter chain master password",
			required: true
		}]);

	var body = {
		name: String(result.chain),
		master: String(result.masterpassword)
	};

	request({
		url: "http://" + result.host + "/api/chains/install",
		method: "post",
		json: true,
		body: body
	}, function (err, resp, body) {
		if (err) {
			return console.log(err.toString());
		}

		if (body.success) {
			console.log("Done!", body.path);
		} else {
			return console.log(body.error);
		}
	});
}

async function createGenesisBlock() {
	var genesisSecret = await prompt({
		type: "password",
		name: "genesisSecret",
		message: "Enter master secret of your genesis account",
		validate: bip39Validator
	})

	var wantInbuiltAsset = await inquirer.prompt({
		type: "confirm",
		name: "wantInbuiltAsset",
		message: "Do you want publish a inbuilt asset in this chain?",
		default: false
	})

	var assetInfo = null
	if (wantInbuiltAsset.wantInbuiltAsset) {
		var name = await prompt({
			type: "input",
			name: "assetName",
			message: "Enter asset name, for example: BTC, CNY, USD, MYASSET",
			validate: assetNameValidator
		})
		var amount = await prompt({
			type: "input",
			name: "assetAmount",
			message: "Enter asset total amount",
			validate: amountValidator
		})
		var precision = await prompt({
			type: "input",
			name: "assetPrecison",
			message: "Enter asset precision",
			validate: precisionValidator
		})
		assetInfo = {
			name: name,
			amount: amount,
			precision: precision
		}
	}

	var account = accountHelper.account(genesisSecret)
	var chainBlock = dappHelper.new(account, null, assetInfo);
	var chainGenesisBlockJson = JSON.stringify(chainBlock, null, 2);
	fs.writeFileSync('genesis.json', chainGenesisBlockJson, "utf8");
	console.log("New genesis block is created at: ./genesis.json");
}

module.exports = function (program) {
	program
		.command("chain")
		.description("manage your chains")
		.option("-c, --create", "create new chain")
		.option("-d, --deposit", "deposit funds to chain")
		.option("-w, --withdrawal", "withdraw funds from chain")
		.option("-i, --install", "install chain")
		.option("-u, --uninstall", "uninstall chain")
		.option("-g, --genesis", "create genesis block")
		.action(function (options) {
			(async function () {
				try {
					if (options.create) {
						createChain();
					} else if (options.deposit) {
						depositChain();
					} else if (options.withdrawal) {
						withdrawalChain();
					} else if (options.install) {
						installChain();
					} else if (options.uninstall) {
						uninstallChain();
					} else if (options.genesis) {
						createGenesisBlock()
					} else {
						console.log("'node chain -h' to get help");
					}
				} catch (e) {
					console.error(e)
				}
			})()
		});
}