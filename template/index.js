console.log("Dapp loading process pid " + process.pid)

// require("longjohn");
var async = require("async");
var path = require("path");
var ZSchema = require("z-schema");
var extend = require("extend");

var modules = {};
var ready = false;

function Sandbox() {
  var self = this;
	self.callbacks = {};
	self.callbackCounter = 1;
	self.messageHandler = null;

  global.onmessage = function(data) {
    // console.log('receive ' + data);
		var json;
    if (typeof self.onMessage === 'function') {
			try {
				json = JSON.parse(data);
			} catch (e) {
				console.log('Failed to pase response from parent: ' + data + ', error: ' + e);
				return;
			}

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
				var callback = self.callbacks[callback_id];
				if (!callback) {
					console.log("Can't find callback_id from parent");
					return;
				}
				var error = json.error;
				var response = json.response;
				delete self.callbacks[callback_id];
				setImmediate(callback, error, response);
			} else if (json.type == "asch_call") {
				var callback = function(err, result) {
					var responseObj = {
						type: "dapp_response",
						callback_id: callback_id,
						error: err,
						response: result.response
					}
					try {
						var responseString = JSON.stringify(responseObj);
					} catch (e) {
						console.log("Can't make response to parent: " + e.toString());
						return;
					}
					global.postMessage(responseString);
				}
				var message = json.message;
				if (typeof self.messageHandler === "function") {
					setImmediate(self.messageHandler, message, callback, callback_id);
				}
			}
    }
  }

	self._getCallbackCounter = function() {
		return self.callbackCounter++;
	}
  self.onMessage = function(handler) {
    self.messageHandler = handler;
  }

  self.sendMessage = function(msg, cb) {
		var callback_id = self._getCallbackCounter();
		var messageObj = {
			type: "dapp_call",
			callback_id: callback_id,
			message: msg
		};
		try {
			var messageString = JSON.stringify(messageObj);
		} catch (e) {
			console.log("Can't serialize dapp_call message: " + e.toString());
			return;
		}
		self.callbacks[callback_id] = cb;
    global.postMessage(messageString);
  }
}


async.auto({
		sandbox: function (cb) {
			cb(null, new Sandbox());
		},

		logger: function (cb) {
			cb(null, console.log);
		},

		config: function (cb) {
			cb(null, require("json!./config.json"));
		},

		scheme: ["logger", function (cb, scope) {
			try {
				var db = require("json!./blockchain.json");
			} catch (e) {
				scope.logger("Failed to load blockchain.json");
			}

			var fields = [],
			    aliasedFields = [],
			    types = {},
			    selector = {};

			function getType(type) {
				var nativeType;

				switch (type) {
					case "BigInt":
						nativeType = Number;
						break;
					default:
						nativeType = String;
				}

				return nativeType;
			}

			var i, n, __field, __alias, __type;

			for (i = 0; i < db.length; i++) {
				for (n = 0; n < db[i].tableFields.length; n++) {
					__field = db[i].alias + "." + db[i].tableFields[n].name;;
					__alias = db[i].alias + "_" + db[i].tableFields[n].name;
					__type  = db[i].tableFields[n].type;

					fields.push(__field);
					aliasedFields.push({ field: __field, alias: __alias });
					types[__alias] = getType(__type);
				}

				selector[db[i].table] = extend(db[i], {tableFields: undefined});
			}

			cb(null, {scheme: db, fields: fields, aliasedFields: aliasedFields, types: types, selector: selector});
		}],

		validator: function (cb) {
			ZSchema.registerFormat("publicKey", function (value) {
				try {
					var b = new Buffer(value, "hex");
					return b.length == 32;
				} catch (e) {
					return false;
				}
			});

			ZSchema.registerFormat("signature", function (value) {
				try {
					var b = new Buffer(value, "hex");
					return b.length == 64;
				} catch (e) {
					return false;
				}
			});

			ZSchema.registerFormat("hex", function (value) {
				try {
					new Buffer(value, "hex");
				} catch (e) {
					return false;
				}

				return true;
			});

			var validator = new ZSchema();
			cb(null, validator);
		},

		bus: function (cb) {
			var changeCase = require("change-case");
			var bus = function () {
				this.message = function () {
					if (ready) {
						var args = [];
						Array.prototype.push.apply(args, arguments);
						var topic = args.shift();
						Object.keys(modules).forEach(function (namespace) {
							Object.keys(modules[namespace]).forEach(function (moduleName) {
								var eventName = "on" + changeCase.pascalCase(topic);
								if (typeof(modules[namespace][moduleName][eventName]) == "function") {
									modules[namespace][moduleName][eventName].apply(modules[namespace][moduleName][eventName], args);
								}
							});
						});
					}
				}
			}
			cb(null, new bus)
		},

		sequence: function (cb) {
			var Sequence = require("./modules/helpers/sequence.js");
			var sequence = new Sequence({
				onWarning: function(current, limit){
					scope.logger.warn("Main queue", current)
				}
			});
			cb(null, sequence);
		},

		modules: ["sandbox", "config", "logger", "bus", "sequence", function (cb, scope) {
			// var module = path.join(__dirname, process.argv[3] || "modules.full.json");
			var lib = require("json!./modules.full.json");

			var tasks = [];

			Object.keys(lib).forEach(function (path) {
				var raw = path.split("/");
				var namespace = raw[0];
				var moduleName = raw[1];
				tasks.push(function (cb) {
					var library = require(lib[path]);
					var obj = new library(cb, scope);
					modules[namespace] = modules[namespace] || {};
					modules[namespace][moduleName] = obj;
				});
			})

			async.series(tasks, function (err) {
				cb(err, modules);
			});
		}],

		ready: ["modules", "bus", "logger", function (cb, scope) {
			ready = true;

			scope.bus.message("bind", scope.modules);

			scope.logger("Dapp loaded process pid " + process.pid)
			cb();
		}]
	});
