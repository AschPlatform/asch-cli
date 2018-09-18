const inquirer = require('inquirer')
const fs = require('fs')
const path = require('path')

const contractsPath = path.join('.', 'modules', 'contracts')

function addContract() {
  try {
    const filenames = fs.readdirSync(contractsPath)
    inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: 'Contract file name (without .js)',
      },
    ], (result) => {
      const name = result.filename
      const type = filenames.length
      const filename = `${result.filename}.js`

      let className = ''
      for (let i = 0; i < name.length; i++) {
        className += (i === 0 ? name[i].toUpperCase() : name[i])
      }
      let exampleContract = fs.readFileSync(path.join(__dirname, '..', 'contract-example.js'), 'utf8')
      exampleContract = exampleContract.replace(/ExampleContract/g, className)
      exampleContract = exampleContract.replace(/__TYPE__/g, 'TransactionTypes.' + name.toUpperCase())
      fs.writeFileSync(path.join(contractsPath, filename), exampleContract, 'utf8')

      const typesFile = path.resolve('./modules/helpers/transaction-types.js')
      const transactionTypes = require(typesFile)
      transactionTypes[name.toUpperCase()] = type
      fs.writeFileSync(typesFile, 'module.exports = ' + JSON.stringify(transactionTypes, null, 2), 'utf8')

      console.log('New contract created: ' + ('./contracts/' + filename))
      console.log('Updating contracts list')

      const text = fs.readFileSync(path.join('.', 'modules.full.json'), 'utf8')
      let modules = JSON.parse(text)
      const contractName = 'contracts/' + name
      const dappPathConfig = './' + path.join(contractsPath, filename)

      modules[contractName] = dappPathConfig
      modules = JSON.stringify(modules, false, 2)

      fs.writeFileSync(path.join('.', 'modules.full.json'), modules, 'utf8')
      console.log('Done')
    })
  } catch (e) {
    console.log(e)
  }
}

function deleteContract() {
  inquirer.prompt([
    {
      type: 'input',
      name: 'filename',
      message: 'Contract file name (without .js)',
    },
  ], (result) => {
    const filename = `${result.filename}.js`

    const contractPath = path.join(contractsPath, filename)
    const exists = fs.existsSync(contractPath)
    if (!exists) {
      return console.log(`Contract not found: ${contractPath}`)
    }
    try {
      fs.unlinkSync(contractPath)
      console.log('Contract removed')
      console.log('Updating contracts list')

      const text = fs.readFileSync(path.join('.', 'modules.full.json'), 'utf8')
      let modules = JSON.parse(text)
      let name = 'contracts/' + name
      delete modules[name]
      modules = JSON.stringify(modules, false, 2)
      fs.writeFileSync(path.join('.', 'modules.full.json'), modules, 'utf8')
      console.log('Done')
    } catch (e) {
      console.log(e)
    }
  })
}

module.exports = (program) => {
  program
    .command('contract')
    .description('contract operations')
    .option('-a, --add', 'add new contract')
    .option('-d, --delete', 'delete contract')
    .action((options) => {
      const exist = fs.existsSync(contractsPath)
      if (exist) {
        if (options.add) {
          addContract()
        } else if (options.delete) {
          deleteContract()
        } else {
          console.log('node "contract -h" to get help')
        }
      } else {
        return console.log('./modules/contracts path not found, please change directory to your dapp folder')
      }
    })
}
