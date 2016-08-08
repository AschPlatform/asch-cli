var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Sandbox() {
	this.callbacks = {};
	this.callbackCounter = 1;
	this.messageHandler = null;
	this.dappMessageCb = null;
	EventEmitter.call(this);
}
util.inherits(Sandbox, EventEmitter);

Sandbox.prototype.processParentMessage = function (data) {
	if (typeof this.onMessage === 'function') {
		var json = data;

		if (!json.callback_id) {
			console.log('Incorrent response from parent, missed callback_id field');
			return;
		}
		var callback_id;
		try {
			callback_id = parseInt(json.callback_id);
		} catch (e) {
			console.log("Failed to convert callback_id to integer");
			return;
		}
		if (isNaN(callback_id)) {
			console.log("Incorrect callback_id field, callback_id should be a number");
			return;
		}

		if (json.type == "asch_response") {
			var callback = this.callbacks[callback_id];
			if (!callback) {
				console.log("Can't find callback_id from parent");
				return;
			}
			var error = json.error;
			var response = json.response;
			delete this.callbacks[callback_id];
			setImmediate(callback, error, response);
		} else if (json.type == "asch_call") {
			var callback = function (err, result) {
				var responseObj = {
					type: "dapp_response",
					callback_id: callback_id,
					error: err,
					response: result.response
				}
				this.emit('message', responseObj);
			}.bind(this);
			var message = json.message;
			if (typeof this.messageHandler === "function") {
				setImmediate(this.messageHandler, message, callback, callback_id);
			}
		}
	}
}

Sandbox.prototype._getCallbackCounter = function () {
		return this.callbackCounter++;
}

Sandbox.prototype.onMessage = function (handler) {
	this.messageHandler = handler;
}

Sandbox.prototype.sendMessage = function (msg, cb) {
	var callback_id = this._getCallbackCounter();
	var messageObj = {
		type: "dapp_call",
		callback_id: callback_id,
		message: msg
	};
	this.callbacks[callback_id] = cb;
	this.emit('message', messageObj);
}

Sandbox.prototype.run = function (argv) {
	var options = {
		sandbox: this
	}
	process.argv = argv;
	require('./init')(options, function (err) {
		if (err) {
			console.error('Failed to init: ' + err);
			process.exit();
		} else {
			console.log('Initialize complete');
			this.emit('ready');
		}
	}.bind(this));
}

var instance = new Sandbox();

process.exit = function (code) {
	instance.emit('exit', code);
}
module.exports = instance;