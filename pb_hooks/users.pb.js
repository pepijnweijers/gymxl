/// <reference path="../pb_data/types.d.ts" />

// Registreren kan alleen met een e-mailadres op de whitelist. Rol komt van de whitelist.
onRecordCreateRequest((e) => {
  if (e.hasSuperuserAuth()) return e.next()

  const email = String(e.record.get('email') || '').trim().toLowerCase()
  let toegang
  try {
    toegang = e.app.findFirstRecordByFilter('whitelist', 'email = {:email}', { email })
  } catch (_) {
    throw new ForbiddenError('Dit e-mailadres staat niet op de lijst. Vraag de admin om je toe te voegen.')
  }

  e.record.set('email', email)
  e.record.set('rol', toegang.get('rol'))
  e.record.set('actief', true)
  e.record.set('emailVisibility', true) // collega's kunnen teams met je delen via je e-mailadres
  e.next()
}, 'users')
