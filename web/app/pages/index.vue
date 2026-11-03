<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const pb = usePb()
const user = useUser()
const isAdmin = useIsAdmin()
const fout = useFout()
const teams = ref<RecordModel[]>([])
const trainers = ref<RecordModel[]>([])
const naam = ref('')
const eigenaar = ref<string>()

onMounted(async () => {
  teams.value = await lijst('teams', { sort: 'naam', expand: TEAM_EXPAND }).catch(e => (fout(e), []))
  if (isAdmin.value) trainers.value = await pb.collection('users').getFullList({ sort: 'name', filter: 'actief = true' }).catch(() => [])
})

const recht = (t: RecordModel) => {
  const u = user.value!
  if (t.eigenaar === u.id) return 'Eigenaar'
  if (teamRecht(t).bewerken && u.rol !== 'admin') return 'Bewerken'
  return u.rol === 'admin' ? 'Admin' : 'Inzien'
}

async function maakTeam() {
  if (!naam.value.trim()) return
  try {
    const t = await pb.collection('teams').create({ naam: naam.value.trim(), eigenaar: eigenaar.value || user.value!.id })
    await navigateTo(`/teams/${t.id}`)
  } catch (e) { fout(e) }
}
</script>

<template>
  <h1 class="mb-4 text-2xl font-bold">Teams</h1>
  <p v-if="!teams.length" class="mb-4 text-muted">Je hebt nog geen teams. Maak er hieronder een aan.</p>
  <ul class="mb-6 space-y-2">
    <li v-for="t in teams" :key="t.id">
      <NuxtLink :to="`/teams/${t.id}`" class="flex min-h-14 items-center justify-between rounded-lg border border-default px-4 py-3 hover:bg-elevated">
        <span class="font-medium">{{ t.naam }}</span>
        <UBadge :label="recht(t)" color="neutral" variant="subtle" />
      </NuxtLink>
    </li>
  </ul>
  <h2 class="mb-2 text-lg font-semibold">Nieuw team</h2>
  <form class="grid gap-2" @submit.prevent="maakTeam">
    <UInput v-model="naam" placeholder="Naam van het team" size="xl" aria-label="Naam nieuw team" />
    <USelectMenu v-if="isAdmin" v-model="eigenaar" :items="trainers.map(t => ({ label: t.name, value: t.id }))" value-key="value"
      placeholder="Eigenaar: ikzelf" size="xl" aria-label="Eigenaar (trainer)" />
    <UButton type="submit" label="Team maken" size="xl" icon="i-lucide-plus" block variant="outline" />
  </form>
</template>
