var util = require('util');
var ByteBuffer = require('bytebuffer');
var crypto = require('./crypto.js');
var bignum = require('browserify-bignum');

var bytesTypes = {
	2: function (trs) {
		try {
			var buf = new Buffer(trs.asset.delegates.list.join(","), 'utf8');
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	}
}

function getTransactionBytes(trs, skipSignature) {
	var assetBytes, assetSize;

	try {
		if (trs.type > 0) {
			assetBytes = bytesTypes[trs.type](trs);
			assetSize = assetBytes ? assetBytes.length : 0;
		} else {
			assetSize = 0;
		}

		var tokenBytes = [];
		if (trs.token && trs.token != "XAS") {
			tokenBytes = new Buffer(trs.token, "utf8");
		}

		var bb = new ByteBuffer(1 + 4 + 32 + 8 + 8 + 64 + 64 + assetSize + tokenBytes.length, true);
		bb.writeByte(trs.type);
		bb.writeInt(trs.timestamp);

		var senderPublicKeyBuffer = new Buffer(trs.senderPublicKey, 'hex');
		for (var i = 0; i < senderPublicKeyBuffer.length; i++) {
			bb.writeByte(senderPublicKeyBuffer[i]);
		}

		if (trs.recipientId) {
			var recipient = trs.recipientId.slice(0);
			recipient = bignum(recipient).toBuffer({size: 8});

			for (var i = 0; i < 8; i++) {
				bb.writeByte(recipient[i] || 0);
			}
		} else {
			for (var i = 0; i < 8; i++) {
				bb.writeByte(0);
			}
		}

		bb.writeLong(trs.amount);

		if (tokenBytes.length > 0) {
			for (var i = 0; i < tokenBytes.length; i++) {
				bb.writeByte(tokenBytes[i]);
			}
		}

		if (assetSize > 0) {
			for (var i = 0; i < assetSize; i++) {
				bb.writeByte(assetBytes[i]);
			}
		}

		if (!skipSignature && trs.signature) {
			var signatureBuffer = new Buffer(trs.signature, 'hex');
			for (var i = 0; i < signatureBuffer.length; i++) {
				bb.writeByte(signatureBuffer[i]);
			}
		}

		bb.flip();
	} catch (e) {
		throw Error(e.toString());
	}
	return bb.toBuffer();
}

module.exports = {
	getTransactionBytes: getTransactionBytes
}
