var async = require("async");
var ZSchema = require("z-schema");
var extend = require("extend");
var changeCase = require("change-case");

var modules = {};
var ready = false;

module.exports = function (options, cb) {
  async.auto({
		sandbox: function (cb) {
			cb(null, options.sandbox);
		},

		logger: function (cb) {
			cb(null, console.log);
		},

		config: function (cb) {
			cb(null, require("./config.json"));
		},

		scheme: ["logger", function (cb, scope) {
			try {
				var db = require("./blockchain.json");
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
			var lib = require("./modules.full.json");
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
			cb();
		}]
	}, cb);
}
