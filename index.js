const program = require('commander')
const fs = require('fs')
const path = require('path')
const packageJson = require('./package.json')

function main() {
  const defaultHost = process.env.ASCH_HOST || '127.0.0.1'
  const defaultPort = process.env.ASCH_PORT || 4096
  program.version(packageJson.version)
    .option('-H, --host <host>', `Specify the hostname or ip of the node, default: ${defaultHost}`, defaultHost)
    .option('-P, --port <port>', `Specify the port of the node, default: ${defaultPort}`, defaultPort)
    .option('-M, --main', 'Specify the mainnet, default: false')

  const plugins = fs.readdirSync(path.join(__dirname, 'plugins'))
  plugins.forEach((el) => {
    if (el.endsWith('js')) {
      require(`./plugins/${el}`)(program)
    }
  })

  if (!process.argv.slice(2).length) {
    program.outputHelp()
  }
  program.parse(process.argv)
}

main()
