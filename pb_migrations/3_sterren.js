/// <reference path="../pb_data/types.d.ts" />

// Score van 1-3 (nog niet / bezig / beheerst) naar 1-5 sterren.
// Bestaande scores houden hun betekenis: 1 -> 1, 2 -> 3, 3 -> 5.
migrate((app) => {
  const c = app.findCollectionByNameOrId('beoordelingen')
  c.fields.getByName('score').max = 5
  app.save(c)
  app.db().newQuery('UPDATE beoordelingen SET score = score * 2 - 1 WHERE score BETWEEN 1 AND 3').execute()
}, (app) => {
  app.db().newQuery('UPDATE beoordelingen SET score = (score + 1) / 2').execute()
  const c = app.findCollectionByNameOrId('beoordelingen')
  c.fields.getByName('score').max = 3
  app.save(c)
})
