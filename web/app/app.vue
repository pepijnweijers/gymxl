<script setup lang="ts">
const pb = usePb()
const user = useUser()
const isAdmin = useIsAdmin()
const toast = useToast()
const clubnaam = ref('GymXL')
// Opnieuw laden na inloggen: direct na de installatiewizard bestaat de clubnaam pas.
watch(user, () => lijst('instellingen').then(([r]) => { if (r) clubnaam.value = r.clubnaam }).catch(() => {}), { immediate: true })
useHead({ title: clubnaam })

// Offline: wachtrij versturen bij start, zodra er weer bereik is, en elke 30 seconden.
const online = ref(true)
onMounted(() => {
  online.value = navigator.onLine
  synchroniseer()
  window.addEventListener('online', () => { online.value = true; synchroniseer() })
  window.addEventListener('offline', () => { online.value = false })
  setInterval(synchroniseer, 30_000)
})

function uitloggen() {
  if (outbox.value.length) return toast.add({ title: 'Nog niet alles is verstuurd', description: 'Log uit zodra er weer bereik is, anders gaan wijzigingen verloren.', color: 'warning' })
  pb.authStore.clear()
  wisOfflineCache()
  navigateTo('/login')
}

const menu = computed(() => [
  [{ label: 'Teams', icon: 'i-lucide-users', to: '/' }, { label: 'Oefeningen', icon: 'i-lucide-list', to: '/oefeningen' }, { label: 'Skills', icon: 'i-lucide-star', to: '/skills' }],
  ...(isAdmin.value ? [[{ label: 'Beheer', icon: 'i-lucide-user-cog', to: '/beheer' }]] : []),
  [{ label: 'Mijn account', icon: 'i-lucide-user', to: '/account' }, { label: 'Uitloggen', icon: 'i-lucide-log-out', onSelect: uitloggen }],
])
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <header class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-default bg-default px-4 py-2">
      <NuxtLink to="/" class="truncate text-lg font-bold">{{ clubnaam }}</NuxtLink>
      <div class="flex items-center gap-2">
        <UBadge v-if="!online || outbox.length" color="warning" variant="subtle" icon="i-lucide-cloud-off"
          :label="outbox.length ? `${outbox.length} wacht` : 'Offline'" role="status" />
        <UDropdownMenu v-if="user" :items="menu">
          <UButton icon="i-lucide-menu" color="neutral" variant="ghost" size="lg" :label="user.name" aria-label="Menu openen" />
        </UDropdownMenu>
      </div>
    </header>
    <main class="mx-auto max-w-2xl px-4 pt-4 pb-28">
      <NuxtPage />
    </main>
  </UApp>
</template>
