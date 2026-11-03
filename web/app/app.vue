<script setup lang="ts">
const pb = usePb()
const user = useUser()
const isAdmin = useIsAdmin()
const clubnaam = ref('GymXL')
// Opnieuw laden na inloggen: direct na de installatiewizard bestaat de clubnaam pas.
watch(user, () => pb.collection('instellingen').getFirstListItem('').then(r => { clubnaam.value = r.clubnaam }).catch(() => {}), { immediate: true })
useHead({ title: clubnaam })

const menu = computed(() => [
  [{ label: 'Teams', icon: 'i-lucide-users', to: '/' }, { label: 'Oefeningen', icon: 'i-lucide-list', to: '/oefeningen' }, { label: 'Skills', icon: 'i-lucide-star', to: '/skills' }],
  ...(isAdmin.value ? [[{ label: 'Gebruikers', icon: 'i-lucide-user-cog', to: '/gebruikers' }]] : []),
  [{ label: 'Uitloggen', icon: 'i-lucide-log-out', onSelect: () => { pb.authStore.clear(); navigateTo('/login') } }],
])
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <header class="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-default bg-default px-4 py-2">
      <NuxtLink to="/" class="text-lg font-bold">{{ clubnaam }}</NuxtLink>
      <UDropdownMenu v-if="user" :items="menu">
        <UButton icon="i-lucide-menu" color="neutral" variant="ghost" size="lg" :label="user.name" aria-label="Menu openen" />
      </UDropdownMenu>
    </header>
    <main class="mx-auto max-w-2xl px-4 pt-4 pb-28">
      <NuxtPage />
    </main>
  </UApp>
</template>
