var crypto = require('crypto');
var fs = require('fs');
var cryptoLib = require('../lib/crypto.js');
var transactionsLib = require('../lib/transactions.js');
var accounts = require('./account.js');
var ByteBuffer = require('bytebuffer');

var sender = accounts.account(cryptoLib.generateSecret());

function getBytes(block, skipSignature) {
	var size = 4 + 4 + 8 + 4 + 8 + 8 + 8 + 4 + 32 + 32 + 64;

	var bb = new ByteBuffer(size, true);
	bb.writeInt(block.version);
	bb.writeInt(block.timestamp);
	bb.writeLong(block.height);
	bb.writeString(block.delegate)

	if (block.previousBlock) {
		bb.writeString(block.previousBlock)
	} else {
		bb.writeString('0')
	}

	var payloadHashBuffer = new Buffer(block.payloadHash, 'hex');
	for (var i = 0; i < payloadHashBuffer.length; i++) {
		bb.writeByte(payloadHashBuffer[i]);
	}


	if (!skipSignature && block.signature) {
		var signatureBuffer = new Buffer(block.signature, 'hex');
		for (var i = 0; i < signatureBuffer.length; i++) {
			bb.writeByte(signatureBuffer[i]);
		}
	}

	bb.flip();
	var b = bb.toBuffer();

	return b;
}

function signTransaction(trs, keypair) {
	let bytes = transactionsLib.getTransactionBytes(trs)
	trs.signatures.push(cryptoLib.sign(sender.keypair, bytes))
	bytes = transactionsLib.getTransactionBytes(trs)
	trs.id = cryptoLib.getId(bytes)
	return trs
}

module.exports = {
	getBytes: getBytes,
	new: function (genesisAccount, dapp, accountsFile) {
		var payloadLength = 0,
			payloadHash = crypto.createHash('sha256'),
			transactions = [],
			totalAmount = 0,
			delegates = [];

		// fund recipient account
		if (accountsFile && fs.existsSync(accountsFile)) {
			var lines = fs.readFileSync(accountsFile, 'utf8').split('\n');
			for (var i in lines) {
				var parts = lines[i].split('\t');
				if (parts.length != 2) {
					console.error('Invalid recipient balance format');
					process.exit(1);
				}
				var amount = String(Number(parts[1]) * 100000000)
				var trs = {
					type: 0,
					fee: 0,
					timestamp: 0,
					// senderId: sender.address,
					senderPublicKey: sender.keypair.publicKey,
					signatures: [],
					message: '',
					args: ['XAS', amount, parts[0]]
				};

				transactions.push(signTransaction(trs, sender.keypair));
			}
		} else {
			var balanceTransaction = {
				type: 0,
				fee: 0,
				timestamp: 0,
				recipientId: genesisAccount.address,
				// senderId: sender.address,
				senderPublicKey: sender.keypair.publicKey,
				signatures: [],
				message: '',
				args: ['XAS', '10000000000000000', genesisAccount.address]
			};

			transactions.push(signTransaction(balanceTransaction, sender.keypair));
		}

		// make delegates
		for (var i = 0; i < 101; i++) {
			var delegate = accounts.account(cryptoLib.generateSecret());

			var username = "asch_g" + (i + 1);
			delegate.name = username
			delegates.push(delegate);

			var nameTrs = {
				type: 4,
				fee: 0,
				timestamp: 0,
				senderPublicKey: delegate.keypair.publicKey,
				signatures: [],
				args: [username],
				message: ''
			}
			var delegateTrs = {
				type: 2,
				fee: 0,
				timestamp: 0,
				// senderId: delegate.address,
				senderPublicKey: delegate.keypair.publicKey,
				signatures: [],
				args: [],
				message: ''
			}

			transactions.push(signTransaction(nameTrs, delegate.keypair));
			transactions.push(signTransaction(delegateTrs, delegate.keypair));
		}

		// make votes
		var delegateNames = delegates.map(function (delegate) {
			return delegate.name;
		});

		var voteTransaction = {
			type: 3,
			fee: 0,
			timestamp: 0,
			senderPublicKey: genesisAccount.keypair.publicKey,
			signatures: [],
			args: [delegateNames.join(',')],
			message: ''
		}

		transactions.push(signTransaction(voteTransaction, genesisAccount.keypair));

		// transactions = transactions.sort(function compare(a, b) {
		// 	if (a.type != b.type) {
		// 		if (a.type == 1) {
		// 			return 1;
		// 		}
		// 		if (b.type == 1) {
		// 			return -1;
		// 		}
		// 		return a.type - b.type;
		// 	}
		// 	if (a.amount != b.amount) {
		// 		return a.amount - b.amount;
		// 	}
		// 	return a.id.localeCompare(b.id);
		// });

		transactions.forEach(function (tx) {
			bytes = transactionsLib.getTransactionBytes(tx);
			payloadLength += bytes.length;
			payloadHash.update(bytes);
		});

		payloadHash = payloadHash.digest();

		var block = {
			version: 0,
			payloadHash: payloadHash.toString('hex'),
			timestamp: 0,
			previousBlock: null,
			delegate: sender.keypair.publicKey,
			transactions: transactions,
			height: 1
		};

		bytes = getBytes(block);
		block.signature = cryptoLib.sign(sender.keypair, bytes);
		bytes = getBytes(block);
		block.id = cryptoLib.getId(bytes);

		return {
			block: block,
			delegates: delegates
		};
	},

	from: function (genesisBlock, genesisAccount, dapp) {
		for (var i in genesisBlock.transactions) {
			var tx = genesisBlock.transactions[i];

			if (tx.type == 5) {
				if (tx.asset.dapp.name == dapp.name) {
					throw new Error("DApp with name '" + dapp.name + "' already exists in genesis block");
				}

				if (tx.asset.dapp.git == dapp.git) {
					throw new Error("DApp with git '" + dapp.git + "' already exists in genesis block");
				}

				if (tx.asset.dapp.link == dapp.link) {
					throw new Error("DApp with link '" + dapp.link + "' already exists in genesis block");
				}
			}
		}

		var dappTransaction = {
			type: 5,
			amount: 0,
			fee: 0,
			timestamp: 0,
			recipientId: null,
			senderId: genesisAccount.address,
			senderPublicKey: genesisAccount.keypair.publicKey,
			asset: {
				dapp: dapp
			}
		};

		var bytes = transactionsLib.getTransactionBytes(dappTransaction);
		dappTransaction.signature = cryptoLib.sign(genesisAccount.keypair, bytes);
		bytes = transactionsLib.getTransactionBytes(dappTransaction);
		dappTransaction.id = cryptoLib.getId(bytes);

		genesisBlock.payloadLength += bytes.length;
		var payloadHash = crypto.createHash('sha256').update(new Buffer(genesisBlock.payloadHash, 'hex'));
		payloadHash.update(bytes);
		genesisBlock.payloadHash = payloadHash.digest().toString('hex');

		genesisBlock.transactions.push(dappTransaction);
		genesisBlock.numberOfTransactions += 1;
		genesisBlock.generatorPublicKey = sender.keypair.publicKey;

		bytes = getBytes(genesisBlock);
		genesisBlock.blockSignature = cryptoLib.sign(sender.keypair, bytes);
		bytes = getBytes(genesisBlock);
		genesisBlock.id = cryptoLib.getId(bytes);

		return {
			block: genesisBlock,
			dapp: dappTransaction
		};
	}
}
