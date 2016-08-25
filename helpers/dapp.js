var cryptoLib = require('../lib/crypto.js');
var ByteBuffer = require('bytebuffer');
var bignum = require('browserify-bignum');
var crypto = require('crypto');
var dappTransactionsLib = require('../lib/dapptransactions.js');
var accounts = require('./account.js');

function getBytes(block, skipSignature) {
	var size = 8 + 4 + 4 + 4 + 32 + 32 + 8 + 4 + 4 + 64;

	var bb = new ByteBuffer(size, true);

	if (block.prevBlockId) {
		var pb = bignum(block.prevBlockId).toBuffer({size: '8'});
		for (var i = 0; i < 8; i++) {
			bb.writeByte(pb[i]);
		}
	} else {
		for (var i = 0; i < 8; i++) {
			bb.writeByte(0);
		}
	}

	bb.writeInt(block.height);
	bb.writeInt(block.timestamp);
	bb.writeInt(block.payloadLength);

	var ph = new Buffer(block.payloadHash, 'hex');
	for (var i = 0; i < ph.length; i++) {
		bb.writeByte(ph[i]);
	}

	var pb = new Buffer(block.delegate, 'hex');
	for (var i = 0; i < pb.length; i++) {
		bb.writeByte(pb[i]);
	}

	if (block.pointId) {
		var pb = bignum(block.pointId).toBuffer({ size: '8' });
		for (var i = 0; i < 8; i++) {
			bb.writeByte(pb[i]);
		}
	}

	if (block.pointHeight) {
		bb.writeInt(block.pointHeight);	
	}

	bb.writeInt(block.count);

	if (!skipSignature && block.signature) {
		var pb = new Buffer(block.signature, 'hex');
		for (var i = 0; i < pb.length; i++) {
			bb.writeByte(pb[i]);
		}
	}

	bb.flip();
	var b = bb.toBuffer();

	return b;
}

module.exports = {
	new: function (genesisAccount, publicKeys, assetInfo) {
		var sender = accounts.account(cryptoLib.generateSecret());

		var block = {
			delegate: genesisAccount.keypair.publicKey,
			height: 1,
			pointId: null,
			pointHeight: null,
			transactions: [],
			timestamp: 0,
			payloadLength: 0,
			payloadHash: crypto.createHash('sha256')
		}
	
		var delegates = publicKeys.map(function (key) {
			return "+" + key;
		})
		var delegatesTransaction = {
			type: 2,
			amount: 0,
			fee: 0,
			timestamp: 0,
			recipientId: null,
			senderId: genesisAccount.address,
			senderPublicKey: genesisAccount.keypair.publicKey,
			asset: {
				delegates: {
					list: delegates
				}
			}
		}
		var bytes = dappTransactionsLib.getTransactionBytes(delegatesTransaction);
		delegatesTransaction.signature = cryptoLib.sign(genesisAccount.keypair, bytes);
		bytes = dappTransactionsLib.getTransactionBytes(delegatesTransaction);
		delegatesTransaction.id = cryptoLib.getId(bytes);

		block.payloadLength += bytes.length;
		block.payloadHash.update(bytes);
		block.transactions.push(delegatesTransaction);

		if (assetInfo) {
			var assetTrs = {
				type: 0,
				amount: assetInfo.amount * 100000000,
				token: assetInfo.name,
				fee: 0,
				timestamp: 0,
				recipientId: genesisAccount.address,
				senderId: sender.address,
				senderPublicKey: sender.keypair.publicKey
			}
			bytes = dappTransactionsLib.getTransactionBytes(assetTrs);
			assetTrs.signature = cryptoLib.sign(sender.keypair, bytes);
			bytes = dappTransactionsLib.getTransactionBytes(assetTrs);
			assetTrs.id = cryptoLib.getId(bytes);
	
			block.payloadLength += bytes.length;
			block.payloadHash.update(bytes);
			block.transactions.push(assetTrs);
		}
		block.count = block.transactions.length;

		block.payloadHash = block.payloadHash.digest().toString('hex');
		bytes = getBytes(block);
		block.signature = cryptoLib.sign(genesisAccount.keypair, bytes);
		bytes = getBytes(block);
		block.id = cryptoLib.getId(bytes);

		return block;
	}
}
