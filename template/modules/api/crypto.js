var ed = require("ed25519");
var crypto = require("crypto");
var bignum = require("bignumber");

var self = null;
var library = null;
var modules = null;

/**
 * Creates instance of Crypto API. Use *modules.api.crypto* to get existing object.
 *
 * @param cb - Callback.
 * @param _library - Object that contains helpers.
 * @constructor
 */
function Crypto(cb, _library) {
	self = this;
	library = _library;
	cb(null, self);
}

/**
 * Generate keypair from secret.
 *
 * @param secret - Secret of account.
 * @returns {{publicKey, privateKey}}
 */
Crypto.prototype.keypair = function (secret) {
	var hash = crypto.createHash("sha256").update(secret, "utf8").digest();
	return ed.MakeKeypair(hash);
}

/**
 * Sign bytes data.
 *
 * @param keypair - Keypair.
 * @param data - Data in bytes to sign (Buffer).
 * @return Signature in hex.
 */
Crypto.prototype.sign = function (keypair, data) {
	var hash = crypto.createHash("sha256").update(data).digest();
	return ed.Sign(hash, keypair).toString("hex");
}

/**
 * Verify signature on bytes data.
 *
 * @param publicKey - Public key to verification in hex.
 * @param signature - Signature to verification in hex.
 * @param data - Bytes to verification (Buffer).
 * @returns Boolean (true/false).
 */
Crypto.prototype.verify = function (publicKey, signature, data) {
	var hash = crypto.createHash("sha256").update(data).digest();
	var signatureBuffer = new Buffer(signature, "hex");
	var senderPublicKeyBuffer = new Buffer(publicKey, "hex");
	return ed.Verify(hash, signatureBuffer, senderPublicKeyBuffer);
}

/**
 * Generate id of data.
 *
 * @param data - Bytes of data (Buffer).
 * @return id (string).
 */
Crypto.prototype.getId = function (data) {
	var hash = crypto.createHash("sha256").update(data).digest();
	var temp = new Buffer(8);
	for (var i = 0; i < 8; i++) {
		temp[i] = hash[7 - i];
	}

	var id = bignum.fromBuffer(temp).toString();
	return id;
}

Crypto.prototype.onBind = function (_modules) {
	modules = _modules;
}

module.exports = Crypto;
