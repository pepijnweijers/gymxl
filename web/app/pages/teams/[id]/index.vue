<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const route = useRoute()
const id = route.params.id as string
const pb = usePb()
const user = useUser()
const fout = useFout()
const toast = useToast()

const team = ref<RecordModel | null>(null)
const koppelingen = ref<RecordModel[]>([])
const laatsteBeoordeling = ref<Record<string, string>>({})
const alleLeerlingen = ref<RecordModel[]>([])
const openTraining = ref<RecordModel | null>(null)
const recht = computed(() => teamRecht(team.value))

async function laad() {
  try {
    const [t, k, scores, open] = await Promise.all([
      pb.collection('teams').getOne(id, { expand: 'bewerkers,inzieners' }),
      pb.collection('team_leerlingen').getFullList({ filter: pb.filter('team = {:id}', { id }), expand: 'leerling', sort: 'leerling.voornaam' }),
      pb.collection('huidige_scores').getFullList({ filter: pb.filter('leerling.team_leerlingen_via_leerling.team ?= {:id}', { id }), fields: 'leerling,datum' }),
      pb.collection('trainingen').getList(1, 1, { filter: pb.filter('team = {:id} && afgerond = false', { id }), sort: '-datum' }),
    ])
    team.value = t
    koppelingen.value = k
    laatsteBeoordeling.value = {}
    for (const s of scores) if (!(s.datum <= (laatsteBeoordeling.value[s.leerling] ?? ''))) laatsteBeoordeling.value[s.leerling] = s.datum
    openTraining.value = open.items[0] ?? null
    alleLeerlingen.value = await pb.collection('leerlingen').getFullList({ sort: 'voornaam' })
  } catch (e) { fout(e) }
}
onMounted(laad)

// Herinnering: laatste beoordeling ouder dan 30 dagen (of nooit)
const DERTIG_DAGEN = 30 * 24 * 3600 * 1000
const herinnering = (leerlingId: string) => {
  const d = laatsteBeoordeling.value[leerlingId]
  return !d || Date.now() - new Date(d.replace(' ', 'T')).getTime() > DERTIG_DAGEN
}

// Leerling toevoegen
const nieuw = reactive({ voornaam: '', initiaal: '', geboortejaar: undefined as number | undefined })
async function voegToe() {
  if (!nieuw.voornaam.trim()) return
  try {
    const l = await pb.collection('leerlingen').create({ ...nieuw, voornaam: nieuw.voornaam.trim(), actief: true })
    await pb.collection('team_leerlingen').create({ team: id, leerling: l.id })
    Object.assign(nieuw, { voornaam: '', initiaal: '', geboortejaar: undefined })
    toast.add({ title: `${kindNaam(l)} toegevoegd`, color: 'success' })
    await laad()
  } catch (e) { fout(e) }
}

const bestaandeKeuze = computed(() => alleLeerlingen.value
  .filter(l => !koppelingen.value.some(k => k.leerling === l.id))
  .map(l => ({ label: `${kindNaam(l)}${l.geboortejaar ? ` (${l.geboortejaar})` : ''}`, value: l.id })))
const bestaande = ref<string>()
async function voegBestaandeToe() {
  if (!bestaande.value) return
  await pb.collection('team_leerlingen').create({ team: id, leerling: bestaande.value }).catch(fout)
  bestaande.value = undefined
  await laad()
}

async function verwijder(k: RecordModel) {
  const naam = kindNaam(k.expand?.leerling)
  try {
    await pb.collection('team_leerlingen').delete(k.id)
    koppelingen.value = koppelingen.value.filter(x => x.id !== k.id)
    toast.add({
      title: `${naam} uit team verwijderd`,
      actions: [{ label: 'Ongedaan maken', onClick: async () => { await pb.collection('team_leerlingen').create({ team: id, leerling: k.leerling }).catch(fout); await laad() } }],
    })
  } catch (e) { fout(e) }
}

// Delen
const deelEmail = ref('')
const deelRecht = ref<'bewerkers' | 'inzieners'>('bewerkers')
async function deel() {
  try {
    const u = await pb.collection('users').getFirstListItem(pb.filter('email = {:e}', { e: deelEmail.value.trim() }))
    if (u.id === team.value!.eigenaar) return toast.add({ title: 'Dit is de eigenaar al', color: 'warning' })
    const ander = deelRecht.value === 'bewerkers' ? 'inzieners' : 'bewerkers'
    await pb.collection('teams').update(id, { [`${deelRecht.value}+`]: u.id, [`${ander}-`]: u.id })
    toast.add({ title: `Gedeeld met ${u.name}`, color: 'success' })
    deelEmail.value = ''
    await laad()
  } catch (e: any) {
    if (e?.status === 404) toast.add({ title: 'Geen collega gevonden met dit e-mailadres', color: 'warning' })
    else fout(e)
  }
}
async function stopDelen(veld: string, u: RecordModel) {
  await pb.collection('teams').update(id, { [`${veld}-`]: u.id }).catch(fout)
  await laad()
}

const verwijderOpen = ref(false)
async function verwijderTeam() {
  await pb.collection('teams').delete(id).then(() => navigateTo('/')).catch(fout)
}

async function startTraining() {
  try {
    const t = await pb.collection('trainingen').create({ team: id, datum: new Date().toISOString(), trainer: user.value!.id, afgerond: false })
    const batch = pb.createBatch()
    for (const k of koppelingen.value.filter(k => k.expand?.leerling?.actief !== false)) batch.collection('aanwezigheid').create({ training: t.id, leerling: k.leerling, aanwezig: true })
    await batch.send()
    await navigateTo(`/training/${t.id}`)
  } catch (e) { fout(e) }
}
</script>

<template>
  <div v-if="team">
    <h1 class="mb-4 text-2xl font-bold">{{ team.naam }}</h1>

    <div class="mb-6 grid grid-cols-2 gap-2">
      <UButton v-if="recht.bewerken" :to="`/teams/${id}/beoordelen`" label="Beoordelen" icon="i-lucide-clipboard-check" size="xl" variant="soft" block />
      <UButton :to="`/teams/${id}/geschiedenis`" label="Geschiedenis" icon="i-lucide-history" size="xl" variant="soft" block />
    </div>

    <h2 class="mb-2 text-lg font-semibold">Leerlingen ({{ koppelingen.length }})</h2>
    <ul class="mb-4 divide-y divide-default rounded-lg border border-default">
      <li v-for="k in koppelingen" :key="k.id" class="flex min-h-14 items-center gap-2 px-3">
        <NuxtLink :to="`/leerlingen/${k.leerling}`" class="flex-1 py-3 font-medium">
          {{ kindNaam(k.expand?.leerling) }}
          <span v-if="k.expand?.leerling?.geboortejaar" class="text-sm font-normal text-muted">· {{ k.expand.leerling.geboortejaar }}</span>
        </NuxtLink>
        <UBadge v-if="herinnering(k.leerling)" color="warning" variant="subtle" icon="i-lucide-clock" label="Beoordelen" />
        <UButton v-if="recht.bewerken" icon="i-lucide-x" color="neutral" variant="ghost" size="lg" :aria-label="`${kindNaam(k.expand?.leerling)} uit team verwijderen`" @click="verwijder(k)" />
      </li>
      <li v-if="!koppelingen.length" class="px-3 py-3 text-muted">Nog geen leerlingen.</li>
    </ul>

    <template v-if="recht.bewerken">
      <form class="mb-3 grid grid-cols-[1fr_4rem_6rem] gap-2" @submit.prevent="voegToe">
        <UInput v-model="nieuw.voornaam" placeholder="Voornaam" aria-label="Voornaam" size="xl" />
        <UInput v-model="nieuw.initiaal" placeholder="Init." aria-label="Initiaal achternaam" size="xl" maxlength="3" />
        <UInput v-model.number="nieuw.geboortejaar" type="number" placeholder="Jaar" aria-label="Geboortejaar" size="xl" inputmode="numeric" />
        <UButton type="submit" label="Leerling toevoegen" icon="i-lucide-plus" size="xl" class="col-span-3" block variant="outline" />
      </form>
      <div v-if="bestaandeKeuze.length" class="mb-6 flex gap-2">
        <USelectMenu v-model="bestaande" :items="bestaandeKeuze" value-key="value" placeholder="Leerling uit ander team" size="xl" class="flex-1" />
        <UButton label="Toevoegen" size="xl" variant="outline" :disabled="!bestaande" @click="voegBestaandeToe" />
      </div>
    </template>

    <template v-if="recht.eigenaar">
      <h2 class="mt-8 mb-2 text-lg font-semibold">Delen met collega's</h2>
      <ul class="mb-3 space-y-1">
        <template v-for="veld in ['bewerkers', 'inzieners']" :key="veld">
          <li v-for="u in team.expand?.[veld] ?? []" :key="u.id" class="flex min-h-11 items-center justify-between">
            <span>{{ u.name }} <span class="text-sm text-muted">· {{ veld === 'bewerkers' ? 'bewerken' : 'inzien' }}</span></span>
            <UButton label="Stoppen" color="neutral" variant="ghost" :aria-label="`Delen met ${u.name} stoppen`" @click="stopDelen(veld, u)" />
          </li>
        </template>
      </ul>
      <form class="grid grid-cols-[1fr_auto] gap-2" @submit.prevent="deel">
        <UInput v-model="deelEmail" type="email" placeholder="E-mail collega" aria-label="E-mail collega" size="xl" required />
        <USelect v-model="deelRecht" :items="[{ label: 'Bewerken', value: 'bewerkers' }, { label: 'Inzien', value: 'inzieners' }]" size="xl" aria-label="Recht" />
        <UButton type="submit" label="Delen" size="xl" variant="outline" class="col-span-2" block />
      </form>

      <UModal v-model:open="verwijderOpen" title="Team verwijderen?" :description="`Alle trainingen van ${team.naam} worden ook verwijderd. Leerlingen en hun beoordelingen blijven bestaan.`">
        <UButton label="Team verwijderen" color="error" variant="ghost" class="mt-8" />
        <template #footer>
          <UButton label="Annuleren" color="neutral" variant="outline" @click="verwijderOpen = false" />
          <UButton label="Verwijderen" color="error" @click="verwijderTeam" />
        </template>
      </UModal>
    </template>

    <OnderBalk v-if="recht.bewerken">
      <UButton v-if="openTraining" :to="`/training/${openTraining.id}`" label="Verder met training" size="xl" block />
      <UButton v-else label="Training starten" icon="i-lucide-play" size="xl" block :disabled="!koppelingen.length" @click="startTraining" />
    </OnderBalk>
  </div>
</template>
