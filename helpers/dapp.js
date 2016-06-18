var cryptoLib = require('../lib/crypto.js');
var ByteBuffer = require('bytebuffer');
var bignum = require('browserify-bignum');
var crypto = require('crypto');
var dappTransactionsLib = require('../lib/dapptransactions.js');

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

	var pb = bignum(block.pointId).toBuffer({size: '8'});
	for (var i = 0; i < 8; i++) {
		bb.writeByte(pb[i]);
	}

	bb.writeInt(block.pointHeight);

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
	new: function (genesisAccount, genesisBlock, publicKeys) {
		var delegates = publicKeys.map(function (key) {
			return "+" + key;
		})
		var delegatesTransaction = {
			type: 4,
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
		var block = {
			delegate: genesisAccount.keypair.publicKey,
			height: 1,
			pointId: genesisBlock.id,
			pointHeight: 1,
			transactions: [],
			timestamp: 0
		}
		block.transactions.push(delegatesTransaction);
		block.count = block.transactions.length;

		bytes = dappTransactionsLib.getTransactionBytes(delegatesTransaction);
		delegatesTransaction.signature = cryptoLib.sign(genesisAccount.keypair, bytes);
		bytes = dappTransactionsLib.getTransactionBytes(delegatesTransaction);
		delegatesTransaction.id = cryptoLib.getId(bytes);

		block.payloadLength = bytes.length;
		block.payloadHash = crypto.createHash('sha256').update(bytes).digest().toString('hex');

		var bytes = getBytes(block);
		block.signature = cryptoLib.sign(genesisAccount.keypair, bytes);
		bytes = getBytes(block);
		block.id = cryptoLib.getId(bytes);

		return block;
	}
}
