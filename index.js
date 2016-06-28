var inquirer = require("inquirer");
var program = require("commander");
var gift = require("gift");
var fs = require("fs");
var path = require("path");
var rmdir = require("rmdir");
var cryptoLib = require("./lib/crypto.js");
var npm = require("npm");
var request = require("request");
var valid_url = require("valid-url");
var fsExtra = require('fs-extra');
var async = require('async');
var accountHelper = require("./helpers/account.js");
var blockHelper = require("./helpers/block.js");
var dappHelper = require("./helpers/dapp.js");

var templatePath = path.join(__dirname, "template");
var contractsPath = path.join(".", "modules", "contracts");

function addDapp() {
	var account;
	var newGenesisBlock;
	var genesisBlock = null;
	var block, dapp, delegates;
	var dappBlock;
	var dappsPath = path.join(".", "dapps");
	var dappPath;
	async.series([
		function(next) {
			inquirer.prompt([
				{
					type: "confirm",
					name: "confirmed",
					message: "Existing blockchain will be replaced, are you sure?",
					default: false
				}
			], function(result) {
				next(!result.confirmed);
			});
		},
		function(next) {
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
				account = accountHelper.account(result.secret);
				next();
			})
		},
		function(next) {
			inquirer.prompt([
				{
					type: "confirm",
					name: "confirmed",
					message: "Overwrite the existing genesis block?",
					default: true
				}
			], function (result) {
				newGenesisBlock = result.confirmed;
				next();
			});
		},
		function(next) {
			if (newGenesisBlock) {
				return next();
			}
			fs.readFile(path.join(".", "genesisBlock.json"), "utf8", function(err, content) {
				if (err) {
					return next(err);
				}
				try {
					genesisBlock = JSON.parse(content);
					next();
				} catch (e) {
					return next(e);
				}
			});
		},
		function(next) {
			inquirer.prompt([
				{
					type: "input",
					name: "name",
					message: "Enter DApp name",
					required: true,
					validate: function (value) {
						var done = this.async();

						if (value.length == 0) {
							done("DApp name is too short, minimum is 1 character");
							return;
						}

						if (value.length > 32) {
							done("DApp name is too long, maximum is 32 characters");
							return;
						}

						return done(true)
					}
				},
				{
					type: "input",
					name: "description",
					message: "Enter DApp description",
					validate: function (value) {
						var done = this.async();

						if (value.length > 160) {
							done("DApp description is too long, maximum is 160 characters");
							return;
						}

						return done(true);
					}
				},
				{
					type: "input",
					name: "link",
					message: "Enter DApp link",
					required: true,
					validate: function (value) {
						var done = this.async();

						if (!valid_url.isUri(value)) {
							done("Invalid DApp link, must be a valid url");
							return;
						} else if (value.indexOf(".zip") != value.length - 4) {
							done("Invalid DApp link, does not link to zip file");
							return;
						}

						return done(true);
					}
				},
				{
					type: "input",
					name: "git",
					message: "Enter Github repository (SSH|HTTPS)",
					required: true,
					validate: function (value) {
						var done = this.async();

						if (!(/^git\@github\.com\:.+\/.+\.git$/i.test(value))
							&& !(/^https:\/\/github\.com\/.+\/.+\.git$/i.test(value))) {
							done("Invalid Github repository");
							return;
						}

						return done(true);
					}
				}
			], function (result) {
				if (!result.name || !result.description || !result.link || !result.git) {
					return next(new Error('invalid dapp params'));
				}
				console.log("Generating unique genesis block...");
				if (newGenesisBlock) {
					var r = blockHelper.new(account,
						{
							name: result.name,
							description: result.description,
							link: result.link,
							git: result.git,
							type: 0,
							category: 0
						}
					);

					block = r.block;
					dapp = r.dapp;
					delegates = r.delegates;
				} else {
					try {
						var r = blockHelper.from(genesisBlock, account,
							{
								name: result.name,
								description: result.description,
								link: result.link,
								git: result.git,
								type: 0,
								category: 0
							}
						);
					} catch (e) {
						return next(e);
					}

					block = r.block;
					dapp = r.dapp;
				}
				next();
			});
		},
		function(next) {
			inquirer.prompt([
				{
					type: "input",
					name: "publicKeys",
					message: "Enter public keys of dapp forgers - hex array, use ',' for separator",
					default: account.keypair.publicKey,
					validate: function (value) {
						var done = this.async();

						var publicKeys = value.split(",");

						if (publicKeys.length == 0) {
							done("DApp requires at least 1 public key");
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

						done(true);
					}
				}
			], function (result) {
				if (!result.publicKeys) {
					return next("invalid dapp forger public keys");
				}
				console.log("Creating DApp genesis block");
				dappBlock = dappHelper.new(account, block, result.publicKeys.split(","));
				next();
			});
		},
		function(next) {
			console.log("Fetching Asch Dapps SDK");
			fs.exists(dappsPath, function (exists) {
				if (!exists) {
					fs.mkdir(dappsPath, next);
				} else {
					next();
				}
			});
		},
		function(next) {
			dappPath = path.join(dappsPath, dapp.id);
			fsExtra.copy(templatePath, dappPath, {clobber: true}, next);
		},
		function(next) {
			gift.init(dappPath, function (err, repo) {
				if (err) {
					next(err);
				}

				repo.remote_add("origin", dapp.asset.dapp.git, function(err) {
					if (err) {
						console.log("remote origin already exists");
					}
					next();
				});
			});
		},
		function(next) {
			var packageJson = path.join(dappPath, "package.json");
			var config = null;

			try {
				config = JSON.parse(fs.readFileSync(packageJson));
			} catch (e) {
				return next("Invalid package.json file for " + dApp.transactionId + " DApp");
			}

			npm.load(config, next);
		},
		function(next) {
			console.log("Installing node_modules");
			npm.root = path.join(dappPath, "node_modules");
			npm.prefix = dappPath;
			npm.commands.install(next);
		},
		function(next) {
			console.log("Saving genesis block");
			var genesisBlockJson = JSON.stringify(block, null, 2);
			fs.writeFile(path.join(".", "genesisBlock.json"), genesisBlockJson, "utf8", next);
		},
		function(next) {
			console.log("Updating config");
			fs.readFile(path.join(".", "config.json"), "utf8", function(err, content) {
				if (err) {
					return next(err);
				}
				var config;
				try {
					config = JSON.parse(content);
				} catch (e) {
					return next(e);
				}
				if (newGenesisBlock) {
					config.forging = config.forging || {};
					config.forging.secret = delegates.map(function (d) {
						return d.secret;
					});
				}
				inquirer.prompt([
					{
						type: "confirm",
						name: "confirmed",
						message: "Add dapp to autolaunch?"
					}
				], function (result) {
					if (result.confirmed) {
						config.dapp = config.dapp || {};
						config.dapp.autoexec = config.dapp.autoexec || [];
						config.dapp.autoexec.push({
							params: [
								account.secret,
								"modules.full.json"
							],
							dappid: dapp.id
						})
					}
					fs.writeFile(path.join(".", "config.json"), JSON.stringify(config, null, 2), next);
				});
			});
		}
	], function(err) {
		if (!err) {
			console.log("Done (DApp id is " + dapp.id + ")");	
		} else {
			console.log(err);
		}
	});
}

function changeDapp() {
	inquirer.prompt([
		{
			type: "confirm",
			name: "confirmed",
			message: "Existing blockchain will be replaced, are you sure?",
			default: false
		}
	], function (result) {
		if (result.confirmed) {
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
				},
				{
					type: "input",
					name: "dappId",
					message: "Enter DApp id (folder name of dapp)",
					required: true
				},
			], function (result) {
				var account = accountHelper.account(result.secret);
				var dappId = result.dappId;
				var publicKeys = [];

				var dappPath = path.join(".", "dapps", dappId);
				var dappGenesis = JSON.parse(fs.readFileSync(path.join(dappPath, "genesis.json"), "utf8"));

				inquirer.prompt([
					{
						type: "confirm",
						name: "confirmed",
						message: "Continue with exists forgers public keys",
						required: true,
					}], function (result) {
						if (result.confirmed) {
							publicKeys = dappGenesis.delegates;
						}

						inquirer.prompt([
							{
								type: "input",
								name: "publicKeys",
								message: "Enter public keys of dapp forgers - hex array, use ',' for separator",
								default: account.keypair.publicKey,
								validate: function (value) {
									var done = this.async();

									var publicKeys = value.split(",");

									if (publicKeys.length == 0) {
										done("DApp requires at least 1 public key");
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

									done(true);
								}
							}
						], function (result) {
							console.log("Creating DApp genesis block");

							var dappBlock = dappHelper.new(account, dappGenesis, result.publicKeys.split(","));
							var dappGenesisBlockJson = JSON.stringify(dappBlock, null, 2);

							try {
								fs.writeFileSync(path.join(dappPath, "genesis.json"), dappGenesisBlockJson, "utf8");
							} catch (e) {
								return console.log(err);
							}

							console.log("Done");
						});
					});
			});
		}
	});
}

function depositDapp() {
	inquirer.prompt([
		{
			type: "password",
			name: "secret",
			message: "Enter secret",
			validate: function (value) {
				return value.length > 0 && value.length < 100;
			},
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
			name: "dappId",
			message: "DApp Id",
			required: true
		},
		{
			type: "input",
			name: "secondSecret",
			message: "Enter secondary secret (if defined)",
			validate: function (value) {
				return value.length < 100;
			},
			required: false
		}
	], function (result) {
		var body = {
			secret: result.secret,
			dappId: result.dappId,
			amount: parseInt(result.amount)
		};

		if (result.secondSecret && result.secondSecret.length > 0) {
			body.secondSecret = result.secondSecret;
		}

		inquirer.prompt([
			{
				type: "input",
				name: "host",
				message: "Host and port",
				default: "localhost:7000",
				required: true
			}
		], function (result) {
			request({
				url: "http://" + result.host + "/api/dapps/transaction",
				method: "put",
				json: true,
				body: body
			}, function (err, resp, body) {
				console.log(err, body);
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
		});
	});
}

function withdrawalDapp() {
	inquirer.prompt([
		{
			type: "password",
			name: "secret",
			message: "Enter secret",
			validate: function (value) {
				return value.length > 0 && value.length < 100;
			},
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
			name: "dappId",
			message: "Enter DApp id",
			validate: function (value) {
				var isAddress = /^[0-9]+$/g;
				return isAddress.test(value);
			},
			required: true
		}], function (result) {

			var body = {
				secret: result.secret,
				amount: result.amount
			};

			request({
				url: "http://localhost:7000/api/dapps/" + result.dappId + "/api/withdrawal",
				method: "post",
				json: true,
				body: body
			}, function (err, resp, body) {
				if (err) {
					return console.log(err.toString());
				}

				if (body.success) {
					console.log(body.response.transactionId);
				} else {
					return console.log(body.error);
				}
			});
		});
}

function addContract() {
	try {
		var filenames = fs.readdirSync(contractsPath);
		inquirer.prompt([
			{
			  type: "input",
				name: "filename",
				message: "Contract file name (without .js)"
			}
		], function (result) {
			var name = result.filename;
			var type = filenames.length + 1;
			var filename = result.filename + ".js";

			var exampleContract = fs.readFileSync(path.join(__dirname, "contract-example.js"), "utf8");
			exampleContract = exampleContract.replace(/ExampleContract/g, name);
			exampleContract = exampleContract.replace("//self.type = null;", "self.type = " + type);
			fs.writeFileSync(path.join(contractsPath, filename), exampleContract, "utf8");

			console.log("New contract created: " + ("./contracts/" + filename));
			console.log("Updating contracts list");

			var text = fs.readFileSync(path.join(".", "modules.full.json"), "utf8");
			var modules = JSON.parse(text);
			var contractName = "contracts/" + name;
			var dappPathConfig = "./" + path.join(contractsPath, filename);

			modules[contractName] = dappPathConfig;
			modules = JSON.stringify(modules, false, 2);

			fs.writeFileSync(path.join(".", "modules.full.json"), modules, "utf8");
			console.log("Done");
		});
	} catch (e) {
		console.log(e);
	}
}

function deleteContract() {
	inquirer.prompt([
		{
			type: "input",
			name: "filename",
			message: "Contract file name (without .js)"
		}
	], function (result) {
		var name = result.filename;
		var type = filenames.length + 1;
		var filename = result.filename + ".js";

		var contractPath = path.join(contractsPath, filename);
		var exists = fs.existsSync(contractPath);
		if (!exists) {
			return console.log("Contract not found: " + contractPath);
		}
		try {
			fs.unlinkSync(contractPath);
			console.log("Contract removed");
			console.log("Updating contracts list");
			
			var text = fs.readFileSync(path.join(".", "modules.full.json"), "utf8");
			var modules = JSON.parse(text);
			var name = "contracts/" + name;
			delete modules[name];
			modules = JSON.stringify(modules, false, 2);
			fs.writeFileSync(path.join(".", "modules.full.json"), modules, "utf8");
			console.log("Done");
		} catch (e) {
			console.log(e);
		}
	});
}

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

function main() {
	program.version("1.1.3");

	program
		.command("dapps")
		.description("manage your dapps")
		.option("-a, --add", "add new dapp")
		.option("-c, --change", "change dapp genesis block")
		.option("-d, --deposit", "deposit funds to dapp")
		.option("-w, --withdrawal", "withdraw funds from dapp")
		.action(function (options) {
			if (options.add) {
				addDapp();
			} else if (options.change) {
				changeDapp();
			} else if (options.deposit) {
				depositDapp();
			} else if (options.withdrawal) {
				withdrawalDapp();
			} else {
				console.log("'node dapps -h' to get help");
			}
		});

	program
		.command("contract")
		.description("contract operations")
		.option("-a, --add", "add new contract")
		.option("-d, --delete", "delete contract")
		.action(function (options) {
			var exist = fs.exists(contractsPath);
			if (exist) {
				if (options.add) {
					addContract();
				} else if (options.delete) {
					deleteContract();
				} else {
					console.log("'node contract -h' to get help");
				}
			} else {
				return console.log("./modules/contracts path not found, please change directory to your dapp folder");
			}
		});

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
		
  program
	  .command("genesis")
		.description("generate genesis block")
		.action(function(options) {
			genGenesisBlock();
		});

	if (!process.argv.slice(2).length) {
		program.outputHelp();
	}

	program.parse(process.argv);
}

main();
