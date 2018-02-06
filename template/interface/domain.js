app.route.get('/domain/:domain',  async function (req) {
    return await app.model.Domain.findOne({domain: req.params.domain})
})

app.route.get('/domain/suffix/:suffix',  async function (req) {
    return await app.model.Domain.findAll({suffix: req.params.suffix})
})