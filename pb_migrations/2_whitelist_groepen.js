/// <reference path="../pb_data/types.d.ts" />

// Whitelist voor registratie (er is geen mail), trainersgroepen, en teams delen met een groep.
migrate((app) => {
  const ADMIN = '@request.auth.rol = "admin"'
  const AUTH = '@request.auth.id != ""'
  const ik = '@request.auth.id'
  const zien = (p) => `(${ADMIN} || ${p}eigenaar ?= ${ik} || ${p}bewerkers.id ?= ${ik} || ${p}inzieners.id ?= ${ik} || ${p}groepen_bewerken.leden.id ?= ${ik} || ${p}groepen_inzien.leden.id ?= ${ik})`
  const bewerken = (p) => `(${ADMIN} || ${p}eigenaar ?= ${ik} || ${p}bewerkers.id ?= ${ik} || ${p}groepen_bewerken.leden.id ?= ${ik})`
  const zet = (naam, regels) => { const c = app.findCollectionByNameOrId(naam); Object.assign(c, regels); app.save(c) }
  const regels = (p) => ({ listRule: zien(p), viewRule: zien(p), createRule: bewerken(p), updateRule: bewerken(p), deleteRule: bewerken(p) })
  const datums = () => [new AutodateField({ name: 'created', onCreate: true }), new AutodateField({ name: 'updated', onCreate: true, onUpdate: true })]

  const whitelist = new Collection({
    type: 'base', name: 'whitelist',
    listRule: ADMIN, viewRule: ADMIN, createRule: ADMIN, updateRule: ADMIN, deleteRule: ADMIN,
    fields: [
      { name: 'email', type: 'email', required: true },
      { name: 'rol', type: 'select', values: ['admin', 'trainer'], maxSelect: 1, required: true },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_whitelist_email ON whitelist (email COLLATE NOCASE)'],
  })
  for (const f of datums()) whitelist.fields.add(f)
  app.save(whitelist)

  const usersId = app.findCollectionByNameOrId('users').id
  const groepen = new Collection({
    type: 'base', name: 'trainersgroepen',
    listRule: AUTH, viewRule: AUTH, createRule: ADMIN, updateRule: ADMIN, deleteRule: ADMIN,
    fields: [
      { name: 'naam', type: 'text', required: true },
      { name: 'leden', type: 'relation', collectionId: usersId, maxSelect: 999 },
    ],
  })
  for (const f of datums()) groepen.fields.add(f)
  app.save(groepen)

  const teams = app.findCollectionByNameOrId('teams')
  teams.fields.add(new RelationField({ name: 'groepen_bewerken', collectionId: groepen.id, maxSelect: 999 }))
  teams.fields.add(new RelationField({ name: 'groepen_inzien', collectionId: groepen.id, maxSelect: 999 }))
  app.save(teams)

  // Registreren mag iedereen; de hook users.pb.js laat alleen e-mailadressen van de whitelist toe.
  zet('users', { createRule: '', manageRule: ADMIN })
  // Admin mag teams aanmaken voor een trainer
  zet('teams', { listRule: zien(''), viewRule: zien(''), createRule: `${AUTH} && (eigenaar = ${ik} || ${ADMIN})` })

  const viaTeams = 'team_leerlingen_via_leerling.team.'
  zet('leerlingen', { listRule: zien(viaTeams), viewRule: zien(viaTeams), updateRule: bewerken(viaTeams) })
  zet('team_leerlingen', regels('team.'))
  zet('beoordelingen', { listRule: zien('leerling.' + viaTeams), viewRule: zien('leerling.' + viaTeams), createRule: `door = ${ik} && ${bewerken('leerling.' + viaTeams)}` })
  zet('huidige_scores', { listRule: zien('leerling.' + viaTeams), viewRule: zien('leerling.' + viaTeams) })
  zet('trainingen', Object.assign(regels('team.'), { createRule: `trainer = ${ik} && ${bewerken('team.')}` }))
  zet('aanwezigheid', regels('training.team.'))
  zet('training_oefeningen', regels('training.team.'))
  zet('groepsindeling', regels('training_oefening.training.team.'))
}, (app) => {
  const teams = app.findCollectionByNameOrId('teams')
  teams.fields.removeByName('groepen_bewerken')
  teams.fields.removeByName('groepen_inzien')
  app.save(teams)
  for (const n of ['trainersgroepen', 'whitelist']) app.delete(app.findCollectionByNameOrId(n))
  // Regels van 1_init terugzetten: draai die migratie zo nodig opnieuw.
})
