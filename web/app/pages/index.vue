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
const nieuwOpen = ref(false)

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
  <p v-if="!teams.length" class="mb-4 text-muted">Je hebt nog geen teams. Maak er onderaan een aan.</p>
  <ul class="mb-6 space-y-2">
    <li v-for="t in teams" :key="t.id">
      <NuxtLink :to="`/teams/${t.id}`" class="flex min-h-14 items-center justify-between rounded-lg border border-default px-4 py-3 hover:bg-elevated">
        <span class="font-medium">{{ t.naam }}</span>
        <UBadge :label="recht(t)" color="neutral" variant="subtle" />
      </NuxtLink>
    </li>
  </ul>
  <UModal v-model:open="nieuwOpen" title="Nieuw team">
    <template #body>
      <form id="nieuw-team" class="space-y-3" @submit.prevent="maakTeam">
        <UFormField label="Naam" required><UInput v-model="naam" size="xl" class="w-full" required /></UFormField>
        <UFormField v-if="isAdmin" label="Eigenaar" hint="Leeg = jijzelf">
          <USelectMenu v-model="eigenaar" :items="trainers.map(t => ({ label: t.name, value: t.id }))" value-key="value" placeholder="Ikzelf" size="xl" class="w-full" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <UButton label="Annuleren" color="neutral" variant="outline" @click="nieuwOpen = false" />
      <UButton type="submit" form="nieuw-team" label="Team maken" class="ml-auto" />
    </template>
  </UModal>
  <OnderBalk>
    <UButton label="Nieuw team" icon="i-lucide-plus" size="xl" block @click="nieuwOpen = true" />
  </OnderBalk>
</template>
