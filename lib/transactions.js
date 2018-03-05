var util = require('util');
var ByteBuffer = require('bytebuffer');
var crypto = require('./crypto.js');
var bignum = require('browserify-bignum');

var bytesTypes = {
	2: function (trs) {
		try {
			var buf = new Buffer(trs.asset.delegate.username, 'utf8');
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	},

	3: function (trs) {
		try {
			var buf = trs.asset.vote.votes ? new Buffer(trs.asset.vote.votes.join(''), 'utf8') : null;
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	},

	5: function (trs) {
		try {
			var buf = new Buffer([]);
			var nameBuf = new Buffer(trs.asset.dapp.name, 'utf8');
			buf = Buffer.concat([buf, nameBuf]);

			if (trs.asset.dapp.description) {
				var descriptionBuf = new Buffer(trs.asset.dapp.description, 'utf8');
				buf = Buffer.concat([buf, descriptionBuf]);
			}

			if (trs.asset.dapp.git) {
				buf = Buffer.concat([buf, new Buffer(trs.asset.dapp.git, 'utf8')]);
			}

			var bb = new ByteBuffer(4 + 4, true);
			bb.writeInt(trs.asset.dapp.type);
			bb.writeInt(trs.asset.dapp.category);
			bb.flip();

			buf = Buffer.concat([buf, bb.toBuffer()]);
		} catch (e) {
			throw Error(e.toString());
		}

		return buf;
	}
}

function getTransactionBytes(trs, skipSignature, skipSecondSignature) {
	var bb = new ByteBuffer(1, true);
	bb.writeInt(trs.type);
	bb.writeInt(trs.timestamp);
	bb.writeLong(trs.fee);

	var senderPublicKeyBuffer = new Buffer(trs.senderPublicKey, 'hex');
	for (var i = 0; i < senderPublicKeyBuffer.length; i++) {
		bb.writeByte(senderPublicKeyBuffer[i]);
	}

	if (trs.message) bb.writeString(trs.message);
	if (trs.args) {
		for (var i = 0; i < trs.args.length; ++i) {
			bb.writeString(trs.args[i])
		}
	}

	if (!skipSignature && trs.signatures) {
		for (let signature of trs.signatures) {
		  var signatureBuffer = new Buffer(signature, 'hex');
		  for (var i = 0; i < signatureBuffer.length; i++) {
		  	bb.writeByte(signatureBuffer[i]);
		  }
		}
	}

	if (!skipSecondSignature && trs.signSignature) {
		var signSignatureBuffer = new Buffer(trs.signSignature, 'hex');
		for (var i = 0; i < signSignatureBuffer.length; i++) {
			bb.writeByte(signSignatureBuffer[i]);
		}
	}

	bb.flip();

	return bb.toBuffer();
}

module.exports = {
	getTransactionBytes: getTransactionBytes
}
