const inquirer = require('inquirer')
const cryptoLib = require('../lib/crypto.js')
const accountHelper = require('../helpers/account.js')

async function generatePublicKey() {
  const result = await inquirer.prompt([
    {
      type: 'password',
      name: 'secret',
      message: 'Enter secret of your testnet account',
    },
  ])
  const account = accountHelper.generateAccount(result.secret.trim())
  console.log(`Public key: ${account.keypair.publicKey}`)
  console.log(`Address: ${account.address}`)
}

async function generateAccount() {
  const result = await inquirer.prompt([
    {
      type: 'input',
      name: 'amount',
      message: 'Enter number of accounts to generate',
    },
  ])
  const amount = Number(result.amount)
  const accounts = []

  for (let i = 0; i < amount; i++) {
    const account = accountHelper.generateAccount(cryptoLib.generateSecret())
    accounts.push({
      address: account.address,
      secret: account.secret,
      publicKey: account.keypair.publicKey,
    })
  }
  console.log(accounts)
  console.log('Done')
}

module.exports = (program) => {
	console.log(program)
  program
    .command('crypto')
    .description('crypto operations')
    .option('-p, --pubkey', 'generate public key from secret')
    .option('-g, --generate', 'generate random accounts')
    .action((options) => {
      // (async function () {
			// 	console.log(options)
      //   try {
      //     if (options.pubkey) {
      //       generatePublicKey()
      //     } else if (options.generate) {
      //       generateAccount()
      //     } else {
      //       console.log("node 'crypto -h' to get help")
      //     }
      //   } catch (e) {
      //     console.log(e)
      //   }
			// })()
			console.log(options)
    })
}
