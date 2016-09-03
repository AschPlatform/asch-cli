
var inquirer = require("inquirer");
var gift = require("gift");
var fs = require("fs");
var async = require('async');
var path = require("path");
var rmdir = require("rmdir");
var npm = require("npm");
var request = require("request");
var valid_url = require("valid-url");
var fsExtra = require('fs-extra');
var AschJS = require('asch-js');
var accountHelper = require("../helpers/account.js");
var blockHelper = require("../helpers/block.js");
var dappHelper = require("../helpers/dapp.js");
var Api = require("../helpers/api.js");

var templatePath = path.join(__dirname, "..", "template");

var dappCategories = [
	"Common",
	"Business",
	"Social",
	"Education",
	"Entertainment",
	"News",
	"Life",
	"Utilities",
	"Games"
];
function addDapp() {
	var account;
	var secondSecret;
	var dappParams;
	var dappTrs;
	var dappBlock;
	var dappsPath = path.join(".", "dapps");
	var dappPath;
	var assetInfo;
	async.series([
		function(next) {
			inquirer.prompt([
				{
					type: "password",
					name: "secret",
					message: "Enter secret of your testnet account",
					validate: function (value) {
						var done = this.async();

						if (!accountHelper.isValidSecret(value)) {
							done("Secret is not validated by BIP39");
							return;
						}

						done(true);
					}
				},
				{
					type: "password",
					name: "secondSecret",
					message: "Enter second secret of your testnet account if you have"
				}
			], function (result) {
				account = accountHelper.account(result.secret);
				secondSecret = result.secondSecret;
				next();
			})
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
					name: "tags",
					message: "Enter DApp tags",
					validate: function (value) {
						var done = this.async();

						if (value.length > 160) {
							done("DApp tags is too long, maximum is 160 characters");
							return;
						}

						return done(true);
					}
				},
				{
					type: "rawlist",
					name: "category",
					required: true,
					message: "Choose DApp category",
					choices: dappCategories
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
						}
						if (value.indexOf(".zip") != value.length - 4) {
							done("Invalid DApp link, does not link to zip file");
							return;
						}
						if (value.length > 160) {
							return done("DApp link is too long, maximum is 160 characters");
						}

						return done(true);
					}
				},
				{
					type: "input",
					name: "icon",
					message: "Enter DApp icon url",
					validate: function (value) {
						var done = this.async();

						if (!valid_url.isUri(value)) {
							return done("Invalid DApp icon, must be a valid url");
						}
						var extname = path.extname(value);
						if (['.png', '.jpg', '.jpeg'].indexOf(extname) == -1) {
							return done("Invalid DApp icon file type");
						}
						if (value.length > 160) {
							return done("DApp icon url is too long, maximum is 160 characters");
						}

						return done(true);
					}
				}
			], function (result) {
				if (!result.name || !result.link || !result.category) {
					return next(new Error('invalid dapp params'));
				}
				dappParams = {
					name: result.name,
					link: result.link,
					category: dappCategories.indexOf(result.category) + 1,
					description: result.description || "",
					tags: result.tags || "",
					icon: result.icon || "",
					type: 0
				};
				dappTrs = AschJS.dapp.createDapp(account.secret, secondSecret, dappParams);
				console.log("Generate dapp transaction", dappTrs);
				next();
			});
		},
		function(next) {
			inquirer.prompt([
				{
					type: "confirm",
					name: "inbuiltAsset",
					message: "Do you want publish a inbuilt asset in this dapp?",
					default: false
				}
			], function (result) {
				if (!result.inbuiltAsset) {
					return next();
				}
				inquirer.prompt([
					{
						type: "input",
						name: "assetName",
						message: "Enter asset name, for example: BTC, CNY, USD, MYASSET",
						default: ''
					},
					{
						type: "input",
						name: "assetAmount",
						message: "Enter asset total amount",
						default: 1000000
					}
				], function (result) {
					if (!result.assetName || result.assetName === 'XAS') {
						return next('invalid inbuilt asset name');
					}
					var assetAmount = Number(result.assetAmount);
					if (!assetAmount || isNaN(assetAmount) || assetAmount < 0) {
						return next('invalid inbuilt asset amount');
					}
					assetInfo = {
						name: result.assetName,
						amount: assetAmount
					};
					next();
				});
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
				dappBlock = dappHelper.new(account, result.publicKeys.split(","), assetInfo);
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
			dappPath = path.join(dappsPath, dappTrs.id);
			fsExtra.copy(templatePath, dappPath, {clobber: true}, next);
		},
		function(next) {
			console.log("Saving genesis block");
			var genesisBlockJson = JSON.stringify(dappBlock, null, 2);
			fs.writeFile(path.join(dappPath, "genesis.json"), genesisBlockJson, "utf8", next);
		},
		function(next) {
			console.log("Saving dapp meta information");
			var dappParamsJson = JSON.stringify(dappParams, null, 2);
			fs.writeFile(path.join(dappPath, "dapp.json"), dappParamsJson, "utf8", next);
		},
		function (next) {
			console.log("Registering dapp in localnet");
			var api = new Api({port: 4096});
			api.broadcastTransaction(dappTrs, function (err) {
				if (err) {
					next("Failed to register dapp: " + err);
				} else {
					next();
				}
			});
		}
	], function(err) {
		if (err) {
			console.log(err);
		} else {
			setTimeout(function () {
				console.log("Done (DApp id is " + dappTrs.id + ")");
			}, 10000);
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
						if (!accountHelper.isValidSecret(value)) {
							done("Secret is not validated by BIP39");
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
						name: "inbuiltAsset",
						message: "Do you want publish a inbuilt asset in this dapp?",
						default: false
					}
				], function (result) {
					var assetInfo;
					if (result.inbuiltAsset) {
						inquirer.prompt([
							{
								type: "input",
								name: "assetName",
								message: "Enter asset name, for example: BTC, CNY, USD, MYASSET",
								default: ''
							},
							{
								type: "input",
								name: "assetAmount",
								message: "Enter asset total amount",
								default: 1000000
							}
						], function (result) {
							if (!result.assetName || result.assetName === 'XAS') {
								return next('invalid inbuilt asset name');
							}
							var assetAmount = Number(result.assetAmount);
							if (!assetAmount || isNaN(assetAmount) || assetAmount < 0) {
								return next('invalid inbuilt asset amount');
							}
							assetInfo = {
								name: result.assetName,
								amount: assetAmount
							};
						});
					}

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

								var dappBlock = dappHelper.new(account, result.publicKeys.split(","), assetInfo);
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
		var realAmount = parseFloat((parseInt(result.amount) * 100000000).toFixed(0));
		var body = {
			secret: result.secret,
			dappId: result.dappId,
			amount: realAmount
		};

		if (result.secondSecret && result.secondSecret.length > 0) {
			body.secondSecret = result.secondSecret;
		}

		inquirer.prompt([
			{
				type: "input",
				name: "host",
				message: "Host and port",
				default: "localhost:4096",
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
				amount: Number(result.amount)
			};

			request({
				url: "http://localhost:4096/api/dapps/" + result.dappId + "/api/withdrawal",
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
		});
}

function uninstallDapp() {
	inquirer.prompt([
		{
			type: "input",
			name: "dappId",
			message: "Enter dapp id",
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
			message: "Enter dapp master password",
			required: true
		}], function (result) {

			var body = {
				id: String(result.dappId),
				master: String(result.masterpassword)
			};

			request({
				url: "http://" + result.host +  "/api/dapps/uninstall",
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
		});
}

function installDapp() {
	inquirer.prompt([
		{
			type: "input",
			name: "dappId",
			message: "Enter dapp id",
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
			message: "Enter dapp master password",
			required: true
		}], function (result) {

			var body = {
				id: String(result.dappId),
				master: String(result.masterpassword)
			};

			request({
				url: "http://" + result.host +  "/api/dapps/install",
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
		});
}

module.exports = function (program) {
  program
		.command("dapps")
		.description("manage your dapps")
		.option("-a, --add", "add new dapp")
		.option("-c, --change", "change dapp genesis block")
		.option("-d, --deposit", "deposit funds to dapp")
		.option("-w, --withdrawal", "withdraw funds from dapp")
		.option("-i, --install", "install dapp")
		.option("-u, --uninstall", "uninstall dapp")
		.action(function (options) {
			if (options.add) {
				addDapp();
			} else if (options.change) {
				changeDapp();
			} else if (options.deposit) {
				depositDapp();
			} else if (options.withdrawal) {
				withdrawalDapp();
			} else if (options.install) {
				installDapp();
			} else if (options.uninstall) {
				uninstallDapp();
			} else {
				console.log("'node dapps -h' to get help");
			}
		});
}