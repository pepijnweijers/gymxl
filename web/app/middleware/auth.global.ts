export default defineNuxtRouteMiddleware(async (to) => {
  const pb = usePb()
  const ingericht = useState<boolean | null>('ingericht', () => null)
  if (ingericht.value === null) {
    // Offline: dan is de app al eerder geladen en dus ingericht.
    ingericht.value = await $fetch<{ ingericht: boolean }>('/api/setup', { baseURL: pb.baseURL }).then(r => r.ingericht).catch(() => true)
  }

  const open = ['/login', '/registreren']
  if (!ingericht.value) return to.path === '/setup' ? undefined : navigateTo('/setup')
  if (to.path === '/setup') return navigateTo('/')

  // Eén keer per start de sessie verversen, zodat een geblokkeerde trainer eruit valt. Offline blijf je ingelogd.
  const ververst = useState('ververst', () => false)
  if (pb.authStore.isValid && !ververst.value) {
    ververst.value = true
    await pb.collection('users').authRefresh().catch((e) => { if (!isNetwerkFout(e)) pb.authStore.clear() })
  }

  if (!pb.authStore.isValid) return open.includes(to.path) ? undefined : navigateTo('/login')
  if (open.includes(to.path)) return navigateTo('/')
  if (to.meta.admin && pb.authStore.record?.rol !== 'admin') return navigateTo('/')
})
