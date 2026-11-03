/// <reference path="../pb_data/types.d.ts" />

// Installatiewizard: werkt alleen zolang er nog geen gebruikers zijn.
routerAdd('GET', '/api/setup', (e) => {
  return e.json(200, { ingericht: $app.countRecords('users') > 0 })
})

routerAdd('POST', '/api/setup', (e) => {
  const body = e.requestInfo().body
  const clubnaam = String(body.clubnaam || '').trim()
  const naam = String(body.naam || '').trim()
  const email = String(body.email || '').trim()
  const wachtwoord = String(body.wachtwoord || '')
  if (!clubnaam || !naam || !email || wachtwoord.length < 10) {
    throw new BadRequestError('Vul clubnaam, naam, e-mail en een wachtwoord van minstens 10 tekens in.')
  }

  $app.runInTransaction((tx) => {
    if (tx.countRecords('users') > 0) throw new ForbiddenError('De app is al ingericht.')

    const inst = new Record(tx.findCollectionByNameOrId('instellingen'))
    inst.set('clubnaam', clubnaam)
    inst.set('ingericht', true)
    tx.save(inst)

    const admin = new Record(tx.findCollectionByNameOrId('users'))
    admin.set('name', naam)
    admin.set('email', email)
    admin.set('emailVisibility', true)
    admin.setPassword(wachtwoord)
    admin.set('verified', true)
    admin.set('rol', 'admin')
    admin.set('actief', true)
    tx.save(admin)
  })

  return e.json(200, { ok: true })
})
