export default defineNuxtRouteMiddleware(async (to) => {
  const pb = usePb()
  const ingericht = useState<boolean | null>('ingericht', () => null)
  if (ingericht.value === null) ingericht.value = (await $fetch<{ ingericht: boolean }>('/api/setup', { baseURL: pb.baseURL })).ingericht

  if (!ingericht.value) return to.path === '/setup' ? undefined : navigateTo('/setup')
  if (to.path === '/setup') return navigateTo('/')

  // Eén keer per start de sessie verversen, zodat een geblokkeerde trainer eruit valt.
  const ververst = useState('ververst', () => false)
  if (pb.authStore.isValid && !ververst.value) {
    ververst.value = true
    await pb.collection('users').authRefresh().catch(() => pb.authStore.clear())
  }

  if (!pb.authStore.isValid) return to.path === '/login' ? undefined : navigateTo('/login')
  if (to.path === '/login') return navigateTo('/')
  if (to.meta.admin && pb.authStore.record?.rol !== 'admin') return navigateTo('/')
})
