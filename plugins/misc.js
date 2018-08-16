const fs = require('fs')
const async = require('async')
const request = require('request')
const accountHelper = require('../helpers/account.js')
const blockHelper = require('../helpers/block.js')
const cryptoLib = require('../lib/crypto.js')
const Api = require('../helpers/api.js')
const AschUtils = require('asch-js').utils

let globalOptions

function getApi() {
  return new Api({
    host: globalOptions.host,
    port: globalOptions.port,
    mainnet: !!globalOptions.main,
  })
}

function writeFileSync(file, obj) {
  const content = (typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2))
  fs.writeFileSync(file, content, 'utf8')
}

function appendFileSync(file, obj) {
  const content = (typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2))
  fs.appendFileSync(file, content, 'utf8')
}

function genGenesisBlock(options) {
	const genesisAccount = accountHelper.genesisAccount(cryptoLib.generateSecret())
  const newBlockInfo = blockHelper.newBlock(genesisAccount, null, options.file)
	const delegateSecrets = newBlockInfo.delegates.map(d => d.secret)

  writeFileSync('./genesisBlock.json', newBlockInfo.block)

  const logFile = './genGenesisBlock.log'
  writeFileSync(logFile, 'genesis account:\n')
  appendFileSync(logFile, genesisAccount)
  appendFileSync(logFile, '\ndelegates secrets:\n')
  appendFileSync(logFile, delegateSecrets)
  console.log('New genesis block and related account has been created, please see the two file: genesisBlock.json and genGenesisBlock.log')
}

function peerstat() {
  const api = getApi()
  api.get('/api/peers/', {}, (err, result) => {
    if (err) {
      console.log('Failed to get peers', err)
      return
    }
    async.map(result.peers, (peer, next) => {
      new Api({ host: peer.ip, port: peer.port }).get('/api/blocks/getHeight', (err, result) => {
        if (err) {
          console.log('%s:%d %s %d', peer.ip, peer.port, peer.version, err)
          next(null, { peer, error })
        } else {
          console.log('%s:%d %s %d', peer.ip, peer.port, peer.version, result.height)
          next(null, { peer, height: result.height })
        }
      })
    }, (err, results) => {
      const heightMap = {}
      const errorMap = {}
      for (let i = 0; i < results.length; ++i) {
        const item = results[i]
        if (item.error) {
          if (!errorMap[item.error]) {
            errorMap[item.error] = []
          }
          errorMap[item.error].push(item.peer)
        } else {
          if (!heightMap[item.height]) {
            heightMap[item.height] = []
          }
          heightMap[item.height].push(item.peer)
        }
      }
      const normalList = []
      const errList = []
      for (let k in heightMap) {
        normalList.push({peers: heightMap[k], height: k})
      }
      for (let k in errorMap) {
        errList.push({peers: errorMap[k], error: k})
      }
      normalList.sort((l, r) => {
        return r.height - l.height
      })
      
      function joinPeerAddrs(peers) {
        const peerAddrs = []
        peers.forEach((p) => {
          peerAddrs.push(p.ip + ':' + p.port)
        })
        return peerAddrs.join(',')
      }
      console.log('======================================')
      for (let i = 0; i < normalList.length; ++i) {
        const item = normalList[i]
        if (i == 0) {
          console.log(item.peers.length + ' height: ' + item.height)
        } else {
          console.log(item.peers.length + ' height: ' + item.height, joinPeerAddrs(item.peers))
        }
      }
      for (const i = 0; i < errList.length; ++i) {
        const item = errList[i]
        console.log(item.peers.length + ' error: ' + item.error, joinPeerAddrs(item.peers))
      }
    })
  })
}

function delegatestat() {
  const api = getApi()
  api.get('/api/delegates', {}, function (err, result) {
    if (err) {
      console.log('Failed to get delegates', err)
      return
    }
    async.map(result.delegates, function (delegate, next) {
      const params = {
        generatorPublicKey: delegate.publicKey,
        limit: 1,
        offset: 0,
        orderBy: 'height:desc'
      }
      api.get('/api/blocks', params, function (err, result) {
        if (err) {
          next(err)
        } else {
          next(null, {delegate: delegate, block: result.blocks[0]})
        }
      })
    }, function (err, delegates) {
      if (err) {
        console.log('Failed to get forged block', err)
        return
      }
      delegates = delegates.sort(function (l, r) {
        if (!l.block) {
          return -1
        }
        if (!r.block) {
          return 1
        }
        return l.block.timestamp - r.block.timestamp
      })
      console.log('name\taddress\trate\tapproval\tproductivity\tproduced\tbalance\theight\tid\ttime')
      for (const i in delegates) {
        const d = delegates[i].delegate
        const b = delegates[i].block
        console.log('%s\t%s\t%d\t%s%%\t%s%%\t%d\t%d\t%s\t%s\t%s(%s)',
            d.username,
            d.address,
            d.rate,
            d.approval,
            d.productivity,
            d.producedblocks,
            d.balance / 100000000,
            b ? b.height : '',
            b ? b.id : '',
            AschUtils.format.fullTimestamp(b ? b.timestamp : ''),
            AschUtils.format.timeAgo(b ? b.timestamp : ''))
      }
    })
  })
}

function ipstat() {
  const api = getApi()
  api.get('/api/peers/', {}, (err, result) => {
    if (err) {
      console.log('Failed to get peers', err)
      return
    }
    async.mapLimit(result.peers, 5, (peer, next) => {
      const url = `http://ip.taobao.com/service/getIpInfo.php?ip=${peer.ip}`
      request(url, (err, resp, body) => {
        if (err || resp.statusCode !== 200) {
          console.error('Failed to get ip info:', err)
          next(null, {})
        } else {
          next(null, JSON.parse(body).data)
        }
      })
    }, (err, ips) => {
      for (let i = 0; i < ips.length; ++i) {
        const ip = ips[i]
        if (ip.country_id) {
          console.log('%s\t%s', ip.country, ip.country_id)
        }
      }
    })
  })
}

module.exports = (program) => {
  globalOptions = program

  program
    .command('creategenesis')
    .description('create genesis block')
    .option('-f, --file <file>', 'genesis accounts balance file')
    .action(genGenesisBlock)

  program
    .command('peerstat')
    .description('analyze block height of all peers')
    .action(peerstat)

  program
    .command('delegatestat')
    .description('analyze delegates status')
    .action(delegatestat)

  program
    .command('ipstat')
    .description('analyze peer ip info')
    .action(ipstat)
}
