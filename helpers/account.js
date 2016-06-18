var crypto = require('../lib/crypto.js');

module.exports = {
	account: function (secret) {
		var kp = crypto.keypair(secret);
		var address = crypto.getId(new Buffer(kp.publicKey, 'hex')) + 'L';

		return {
			keypair: kp,
			address: address,
			secret : secret
		}
	}
}
