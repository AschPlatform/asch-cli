module.exports = {
  register: async function(domain) {
    app.sdb.lock('domain.register@' + domain)
    let exists = await app.model.Domain.exists({ domain })
    if (exists) return 'Domain already registered'
    app.sdb.create('Domain', {
      domain,
      owner: this.trs.senderId,
      suffix: domain.split('.').pop()
    })
  },
  set_ip: async function(domain, ip) {
    app.sdb.lock('domain.register@' + domain)
    let exists = await app.model.Domain.exists({ domain })
    if (!exists) return 'Domain not exists'
    app.sdb.update('Domain', { ip }, { domain })
  }
}