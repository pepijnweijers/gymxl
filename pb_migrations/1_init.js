/// <reference path="../pb_data/types.d.ts" />

// Rechten per team: eigenaar, bewerkers (recht "bewerken") en inzieners (recht "inzien")
// staan als relatievelden op het team zelf. Dat vervangt de collectie team_toegang uit het
// bouwplan: zo blijven gebruiker en recht in één rij en zijn de API-regels eenduidig.
migrate((app) => {
  const ADMIN = '@request.auth.rol = "admin"'
  const AUTH = '@request.auth.id != ""'
  // p = pad naar het team, bijv. "" voor teams zelf of "training.team." voor aanwezigheid
  const zien = (p) => `(${ADMIN} || ${p}eigenaar ?= @request.auth.id || ${p}bewerkers.id ?= @request.auth.id || ${p}inzieners.id ?= @request.auth.id)`
  const bewerken = (p) => `(${ADMIN} || ${p}eigenaar ?= @request.auth.id || ${p}bewerkers.id ?= @request.auth.id)`
  const regels = (p) => ({ listRule: zien(p), viewRule: zien(p), createRule: bewerken(p), updateRule: bewerken(p), deleteRule: bewerken(p) })

  const id = (naam) => app.findCollectionByNameOrId(naam).id
  const rel = (name, collection, extra) => Object.assign({ name, type: 'relation', collectionId: id(collection), maxSelect: 1, cascadeDelete: true, required: true }, extra || {})
  const maak = (name, fields, rules, indexes) => {
    const c = new Collection(Object.assign({ type: 'base', name, fields, indexes: indexes || [] }, rules))
    c.fields.add(new AutodateField({ name: 'created', onCreate: true }))
    c.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
    app.save(c)
  }

  // users: de naam zit al in het standaardveld "name"
  const users = app.findCollectionByNameOrId('users')
  users.fields.add(new SelectField({ name: 'rol', values: ['admin', 'trainer'], maxSelect: 1, required: true }))
  users.fields.add(new BoolField({ name: 'actief' }))
  users.authRule = 'actief = true'
  users.listRule = AUTH
  users.viewRule = AUTH
  users.createRule = ADMIN
  users.updateRule = `${ADMIN} || (id = @request.auth.id && @request.body.rol:isset = false && @request.body.actief:isset = false)`
  users.deleteRule = null // blokkeren, niet verwijderen
  app.save(users)

  // Batch-API aan voor het aanmaken van aanwezigheid en groepjes in één keer.
  const settings = app.settings()
  settings.meta.appName = 'GymXL'
  if ($os.getenv('APP_URL')) settings.meta.appURL = $os.getenv('APP_URL')
  settings.batch.enabled = true
  settings.batch.maxRequests = 200
  app.save(settings)

  maak('instellingen', [
    { name: 'clubnaam', type: 'text', required: true },
    { name: 'ingericht', type: 'bool' },
  ], { listRule: '', viewRule: '', updateRule: ADMIN })

  maak('teams', [
    { name: 'naam', type: 'text', required: true },
    rel('eigenaar', 'users', { cascadeDelete: false }),
    rel('bewerkers', 'users', { maxSelect: 999, required: false, cascadeDelete: false }),
    rel('inzieners', 'users', { maxSelect: 999, required: false, cascadeDelete: false }),
  ], {
    listRule: zien(''),
    viewRule: zien(''),
    createRule: `${AUTH} && eigenaar = @request.auth.id`,
    updateRule: `${ADMIN} || eigenaar = @request.auth.id`,
    deleteRule: `${ADMIN} || eigenaar = @request.auth.id`,
  })

  const viaTeams = 'team_leerlingen_via_leerling.team.'
  maak('leerlingen', [
    { name: 'voornaam', type: 'text', required: true, max: 50 },
    { name: 'initiaal', type: 'text', max: 3 },
    { name: 'geboortejaar', type: 'number', onlyInt: true, min: 1990, max: 2100 },
    { name: 'actief', type: 'bool' },
  ], {})

  maak('team_leerlingen', [rel('team', 'teams'), rel('leerling', 'leerlingen')], regels('team.'),
    ['CREATE UNIQUE INDEX idx_team_leerling ON team_leerlingen (team, leerling)'])

  // Regels pas na team_leerlingen zetten: ze lopen via die back-relatie.
  const leerlingen = app.findCollectionByNameOrId('leerlingen')
  leerlingen.listRule = zien(viaTeams)
  leerlingen.viewRule = zien(viaTeams)
  leerlingen.createRule = AUTH // nog zonder team; de koppeling in team_leerlingen wordt wél gecontroleerd
  leerlingen.updateRule = bewerken(viaTeams)
  leerlingen.deleteRule = ADMIN
  app.save(leerlingen)

  const beheer = { listRule: AUTH, viewRule: AUTH, createRule: ADMIN, updateRule: ADMIN, deleteRule: ADMIN }
  maak('skills', [
    { name: 'naam', type: 'text', required: true },
    { name: 'omschrijving', type: 'text' },
    { name: 'categorie', type: 'text' },
  ], beheer)

  maak('oefeningen', [
    { name: 'naam', type: 'text', required: true },
    { name: 'uitleg', type: 'text', max: 2000 },
    rel('skills', 'skills', { maxSelect: 999, cascadeDelete: false }),
  ], beheer)

  // Nooit overschrijven, altijd toevoegen: geen update- of deleteregel.
  maak('beoordelingen', [
    rel('leerling', 'leerlingen'),
    rel('skill', 'skills'),
    { name: 'score', type: 'number', onlyInt: true, min: 1, max: 3, required: true },
    rel('door', 'users', { cascadeDelete: false }),
    { name: 'datum', type: 'autodate', onCreate: true },
  ], {
    listRule: zien('leerling.' + viaTeams),
    viewRule: zien('leerling.' + viaTeams),
    createRule: `door = @request.auth.id && ${bewerken('leerling.' + viaTeams)}`,
  }, ['CREATE INDEX idx_beoordeling ON beoordelingen (leerling, skill, datum)'])

  // Huidige score = nieuwste beoordeling per leerling en skill.
  app.save(new Collection({
    type: 'view',
    name: 'huidige_scores',
    listRule: zien('leerling.' + viaTeams),
    viewRule: zien('leerling.' + viaTeams),
    viewQuery: `SELECT b.id, b.leerling, b.skill, b.score, b.datum FROM beoordelingen b
      WHERE b.id = (SELECT b2.id FROM beoordelingen b2 WHERE b2.leerling = b.leerling AND b2.skill = b.skill ORDER BY b2.datum DESC, b2.id DESC LIMIT 1)`,
  }))

  maak('trainingen', [
    rel('team', 'teams'),
    { name: 'datum', type: 'date', required: true },
    rel('trainer', 'users', { cascadeDelete: false }),
    { name: 'notitie', type: 'text', max: 500 },
    { name: 'afgerond', type: 'bool' },
  ], Object.assign(regels('team.'), { createRule: `trainer = @request.auth.id && ${bewerken('team.')}` }))

  maak('aanwezigheid', [
    rel('training', 'trainingen'),
    rel('leerling', 'leerlingen'),
    { name: 'aanwezig', type: 'bool' },
  ], regels('training.team.'), ['CREATE UNIQUE INDEX idx_aanwezig ON aanwezigheid (training, leerling)'])

  maak('training_oefeningen', [
    rel('training', 'trainingen'),
    rel('oefening', 'oefeningen'),
    { name: 'groepsgrootte', type: 'number', onlyInt: true, min: 1, max: 50, required: true },
    { name: 'volgorde', type: 'number', onlyInt: true },
  ], regels('training.team.'))

  maak('groepsindeling', [
    rel('training_oefening', 'training_oefeningen'),
    { name: 'groepsnummer', type: 'number', onlyInt: true, min: 0 }, // 0 = nog niet beoordeeld
    rel('leerling', 'leerlingen'),
    { name: 'handmatig', type: 'bool' },
  ], regels('training_oefening.training.team.'))
}, (app) => {
  for (const n of ['groepsindeling', 'training_oefeningen', 'aanwezigheid', 'trainingen', 'huidige_scores', 'beoordelingen', 'oefeningen', 'skills', 'team_leerlingen', 'leerlingen', 'teams', 'instellingen']) {
    try { app.delete(app.findCollectionByNameOrId(n)) } catch (_) {}
  }
  const users = app.findCollectionByNameOrId('users')
  users.fields.removeByName('rol')
  users.fields.removeByName('actief')
  users.authRule = ''
  app.save(users)
})
