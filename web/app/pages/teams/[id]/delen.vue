<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const id = useRoute().params.id as string
const pb = usePb()
const fout = useFout()
const toast = useToast()

const team = ref<RecordModel | null>(null)
const groepen = ref<RecordModel[]>([])
const RECHTEN = [{ label: 'Bewerken', value: 'bewerken' }, { label: 'Inzien', value: 'inzien' }]

async function laad() {
  try {
    ;[team.value, groepen.value] = await Promise.all([
      pb.collection('teams').getOne(id, { expand: 'eigenaar,bewerkers,inzieners,groepen_bewerken,groepen_inzien' }),
      pb.collection('trainersgroepen').getFullList({ sort: 'naam' }),
    ])
  } catch (e) { fout(e) }
}
onMounted(laad)

// Velden per soort en recht: personen -> bewerkers/inzieners, groepen -> groepen_bewerken/groepen_inzien
const veld = (soort: 'persoon' | 'groep', recht: string) => soort === 'persoon' ? (recht === 'bewerken' ? 'bewerkers' : 'inzieners') : `groepen_${recht}`
const ander = (recht: string) => recht === 'bewerken' ? 'inzien' : 'bewerken'

async function deel(soort: 'persoon' | 'groep', doelId: string, recht: string) {
  await pb.collection('teams').update(id, { [`${veld(soort, recht)}+`]: doelId, [`${veld(soort, ander(recht))}-`]: doelId })
  await laad()
}
async function stop(soort: 'persoon' | 'groep', doelId: string, recht: string) {
  await pb.collection('teams').update(id, { [`${veld(soort, recht)}-`]: doelId }).catch(fout)
  await laad()
}

const email = ref('')
const persoonRecht = ref('bewerken')
async function deelMetPersoon() {
  try {
    const u = await pb.collection('users').getFirstListItem(pb.filter('email = {:e}', { e: email.value.trim().toLowerCase() }))
    if (u.id === team.value!.eigenaar) return toast.add({ title: 'Dit is de eigenaar al', color: 'warning' })
    await deel('persoon', u.id, persoonRecht.value)
    toast.add({ title: `Gedeeld met ${u.name}`, color: 'success' })
    email.value = ''
  } catch (e: any) {
    if (e?.status === 404) toast.add({ title: 'Geen trainer met dit e-mailadres', description: 'Die moet eerst een account hebben.', color: 'warning' })
    else fout(e)
  }
}

const groepId = ref<string>()
const groepRecht = ref('bewerken')
async function deelMetGroep() {
  if (!groepId.value) return
  try {
    await deel('groep', groepId.value, groepRecht.value)
    toast.add({ title: 'Gedeeld met groep', color: 'success' })
    groepId.value = undefined
  } catch (e) { fout(e) }
}

const gedeeld = computed(() => {
  const e = team.value?.expand ?? {}
  return [
    ...(e.groepen_bewerken ?? []).map((g: RecordModel) => ({ soort: 'groep' as const, id: g.id, naam: `${g.naam} (groep, ${g.leden.length})`, recht: 'bewerken' })),
    ...(e.groepen_inzien ?? []).map((g: RecordModel) => ({ soort: 'groep' as const, id: g.id, naam: `${g.naam} (groep, ${g.leden.length})`, recht: 'inzien' })),
    ...(e.bewerkers ?? []).map((u: RecordModel) => ({ soort: 'persoon' as const, id: u.id, naam: u.name, recht: 'bewerken' })),
    ...(e.inzieners ?? []).map((u: RecordModel) => ({ soort: 'persoon' as const, id: u.id, naam: u.name, recht: 'inzien' })),
  ]
})

const naam = ref('')
watch(team, t => { naam.value = t?.naam ?? '' })
async function hernoem() {
  await pb.collection('teams').update(id, { naam: naam.value.trim() }).then(() => toast.add({ title: 'Opgeslagen', color: 'success' })).catch(fout)
}

const verwijderOpen = ref(false)
async function verwijderTeam() {
  await pb.collection('teams').delete(id).then(() => navigateTo('/')).catch(fout)
}
</script>

<template>
  <div v-if="team">
    <UButton :to="`/teams/${id}`" :label="team.naam" icon="i-lucide-arrow-left" variant="link" class="mb-2 -ml-2" />
    <h1 class="mb-1 text-2xl font-bold">Delen en instellingen</h1>
    <p class="mb-4 text-sm text-muted">Eigenaar: {{ team.expand?.eigenaar?.name }}</p>

    <h2 class="mb-2 text-lg font-semibold">Gedeeld met</h2>
    <ul class="mb-6 divide-y divide-default rounded-lg border border-default">
      <li v-for="g in gedeeld" :key="g.soort + g.id + g.recht" class="flex min-h-12 items-center justify-between gap-2 px-3">
        <span>{{ g.naam }} <span class="text-sm text-muted">· {{ g.recht }}</span></span>
        <UButton label="Stoppen" color="neutral" variant="ghost" :aria-label="`Delen met ${g.naam} stoppen`" @click="stop(g.soort, g.id, g.recht)" />
      </li>
      <li v-if="!gedeeld.length" class="px-3 py-3 text-muted">Nog met niemand gedeeld.</li>
    </ul>

    <h2 class="mb-2 text-lg font-semibold">Delen met een groep</h2>
    <form class="mb-6 grid grid-cols-[1fr_auto] gap-2" @submit.prevent="deelMetGroep">
      <USelect v-model="groepId" :items="groepen.map(g => ({ label: g.naam, value: g.id }))" placeholder="Kies trainersgroep" size="xl" aria-label="Trainersgroep" />
      <USelect v-model="groepRecht" :items="RECHTEN" size="xl" aria-label="Recht voor groep" />
      <UButton type="submit" label="Delen met groep" size="xl" variant="outline" class="col-span-2" block :disabled="!groepId" />
    </form>
    <p v-if="!groepen.length" class="-mt-4 mb-6 text-sm text-muted">De admin maakt trainersgroepen aan bij Beheer.</p>

    <h2 class="mb-2 text-lg font-semibold">Delen met een collega</h2>
    <form class="mb-8 grid grid-cols-[1fr_auto] gap-2" @submit.prevent="deelMetPersoon">
      <UInput v-model="email" type="email" placeholder="E-mail collega" aria-label="E-mail collega" size="xl" required />
      <USelect v-model="persoonRecht" :items="RECHTEN" size="xl" aria-label="Recht voor collega" />
      <UButton type="submit" label="Delen met collega" size="xl" variant="outline" class="col-span-2" block />
    </form>

    <h2 class="mb-2 text-lg font-semibold">Team</h2>
    <form class="mb-4 flex gap-2" @submit.prevent="hernoem">
      <UInput v-model="naam" size="xl" class="flex-1" aria-label="Teamnaam" required />
      <UButton type="submit" label="Opslaan" size="xl" variant="outline" />
    </form>
    <UModal v-model:open="verwijderOpen" title="Team verwijderen?" :description="`Alle trainingen van ${team.naam} worden ook verwijderd. Leerlingen en hun beoordelingen blijven bestaan.`">
      <UButton label="Team verwijderen" color="error" variant="ghost" />
      <template #footer>
        <UButton label="Annuleren" color="neutral" variant="outline" @click="verwijderOpen = false" />
        <UButton label="Verwijderen" color="error" @click="verwijderTeam" />
      </template>
    </UModal>
  </div>
</template>
