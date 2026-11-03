<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const pb = usePb()
const user = useUser()
const fout = useFout()
const teams = ref<RecordModel[]>([])
const naam = ref('')

const laad = async () => { teams.value = await pb.collection('teams').getFullList({ sort: 'naam' }).catch(e => (fout(e), [])) }
onMounted(laad)

const recht = (t: RecordModel) => t.eigenaar === user.value?.id ? 'Eigenaar' : t.bewerkers?.includes(user.value?.id) ? 'Bewerken' : t.inzieners?.includes(user.value?.id) ? 'Inzien' : 'Admin'

async function maakTeam() {
  if (!naam.value.trim()) return
  try {
    const t = await pb.collection('teams').create({ naam: naam.value.trim(), eigenaar: user.value!.id })
    naam.value = ''
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
  <form class="flex gap-2" @submit.prevent="maakTeam">
    <UInput v-model="naam" placeholder="Naam nieuw team" size="xl" class="flex-1" aria-label="Naam nieuw team" />
    <UButton type="submit" label="Team maken" size="xl" icon="i-lucide-plus" />
  </form>
</template>
