
var program = require("commander");

var fs = require("fs");
var package = require('./package.json');

function main() {
	program.version(package.version);
	var plugins = fs.readdirSync('./plugins');
	plugins.forEach(function (el) {
		require('./plugins/' + el)(program);
	});

	if (!process.argv.slice(2).length) {
		program.outputHelp();
	}
	program.parse(process.argv);
}

main();
