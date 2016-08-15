
var program = require("commander");

var fs = require("fs");
var path = require("path");
var package = require('./package.json');

function main() {
	program.version(package.version)
		.option('-H, --host <host>', 'Specify the hostname or ip of the node, default: 127.0.0.1')
		.option('-P, --port <port>', 'Specify the port of the node, default: 4096')
		.option('-M, --main', 'Specify the mainnet, default: false')
	
	var plugins = fs.readdirSync(path.join(__dirname, 'plugins'));
	plugins.forEach(function (el) {
		require('./plugins/' + el)(program);
	});

	if (!process.argv.slice(2).length) {
		program.outputHelp();
	}
	program.parse(process.argv);
}

main();
