<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const id = useRoute().params.id as string
const pb = usePb()
const fout = useFout()
const toast = useToast()

const training = ref<RecordModel | null>(null)
const aanwezigheid = ref<RecordModel[]>([])
const trainingOefeningen = ref<RecordModel[]>([])
const indeling = ref<RecordModel[]>([])
const oefeningen = ref<RecordModel[]>([])
const scores = ref<Record<string, Record<string, number>>>({}) // leerling -> skill -> score
const recht = computed(() => teamRecht(training.value?.expand?.team))

async function laadIndeling() {
  const f = pb.filter('training = {:id}', { id })
  ;[trainingOefeningen.value, indeling.value] = await Promise.all([
    lijst('training_oefeningen', { filter: f, sort: 'volgorde', expand: 'oefening' }, d => d.training === id),
    lijst('groepsindeling', { filter: pb.filter('training_oefening.training = {:id}', { id }), expand: 'leerling', sort: 'leerling.voornaam' }, () => true),
  ])
}

onMounted(async () => {
  try {
    training.value = await een('trainingen', id, { expand: `team,trainer,team.${TEAM_EXPAND}` })
    notitie.value = training.value.notitie
    const team = training.value.team
    const [a, o, h] = await Promise.all([
      lijst('aanwezigheid', { filter: pb.filter('training = {:id}', { id }), expand: 'leerling', sort: 'leerling.voornaam' }, d => d.training === id),
      lijst('oefeningen', { sort: 'naam' }),
      huidigeScores(team),
      laadIndeling(),
    ])
    aanwezigheid.value = a
    oefeningen.value = o
    for (const s of h) (scores.value[s.leerling] ??= {})[s.skill] = s.score
  } catch (e) { fout(e) }
})

const aantalAanwezig = computed(() => aanwezigheid.value.filter(a => a.aanwezig).length)
async function wissel(a: RecordModel) {
  try {
    Object.assign(a, await schrijf('aanwezigheid', 'update', a.id, { aanwezig: !a.aanwezig }))
  } catch (e) { fout(e) }
}

// Oefening toevoegen en groepjes maken
const oefeningId = ref<string>()
const grootte = ref(4)
const bezig = ref(false)
async function maakGroepjesVoorOefening() {
  const oefening = oefeningen.value.find(o => o.id === oefeningId.value)
  if (!oefening) return toast.add({ title: 'Kies eerst een oefening', color: 'warning' })
  bezig.value = true
  try {
    const kinderen = aanwezigheid.value.filter(a => a.aanwezig).map(a => ({ id: a.leerling, naam: kindNaam(a.expand?.leerling), scores: scores.value[a.leerling] ?? {} }))
    const { groepjes, nietBeoordeeld } = maakGroepjes(kinderen, oefening.skills, grootte.value)
    const to = await schrijf('training_oefeningen', 'create', null, { training: id, oefening: oefening.id, groepsgrootte: grootte.value, volgorde: trainingOefeningen.value.length + 1 }, { oefening })
    const leerling = (lid: string) => aanwezigheid.value.find(a => a.leerling === lid)?.expand?.leerling
    const indelen = [...groepjes.flatMap((g, i) => g.map(k => [k.id, i + 1] as const)), ...nietBeoordeeld.map(k => [k.id, 0] as const)]
    await Promise.all(indelen.map(([lid, nr]) => schrijf('groepsindeling', 'create', null, { training_oefening: to.id, groepsnummer: nr, leerling: lid, handmatig: false }, { leerling: leerling(lid) })))
    await laadIndeling()
    oefeningId.value = undefined
    toast.add({ title: `Groepjes voor ${oefening.naam} gemaakt`, color: 'success' })
  } catch (e) { fout(e) } finally { bezig.value = false }
}

const groepenVan = (toId: string) => {
  const g: Record<number, RecordModel[]> = {}
  for (const r of indeling.value.filter(r => r.training_oefening === toId)) (g[r.groepsnummer] ??= []).push(r)
  return g
}

// Verplaatsen zonder slepen: tik op een kind en kies een groepje
const verplaats = ref<RecordModel | null>(null)
const verplaatsOpen = ref(false) // los van verplaats, zodat de titel tijdens het sluiten blijft staan
const doelGroepen = computed(() => {
  if (!verplaats.value) return []
  const nummers = Object.keys(groepenVan(verplaats.value.training_oefening)).map(Number).filter(n => n > 0)
  const nieuw = Math.max(0, ...nummers) + 1
  return [...nummers, nieuw].filter(n => n !== verplaats.value!.groepsnummer).map(n => ({ n, label: n === nieuw ? 'Nieuw groepje' : `Groepje ${n}` }))
})
async function verplaatsNaar(n: number) {
  const r = verplaats.value!
  verplaatsOpen.value = false
  try {
    Object.assign(r, await schrijf('groepsindeling', 'update', r.id, { groepsnummer: n, handmatig: true }))
    toast.add({ title: 'Indeling opgeslagen', color: 'success', duration: 1500 })
  } catch (e) { fout(e) }
}

async function verwijderOefening(to: RecordModel) {
  await schrijf('training_oefeningen', 'delete', to.id).catch(fout)
  await laadIndeling()
}

// Afronden
const notitie = ref('')
async function afronden() {
  try {
    await schrijf('trainingen', 'update', id, { notitie: notitie.value, afgerond: true })
    toast.add({ title: 'Training afgerond', color: 'success' })
    await navigateTo(`/teams/${training.value!.team}`)
  } catch (e) { fout(e) }
}
</script>

<template>
  <div v-if="training">
    <UButton :to="`/teams/${training.team}`" :label="training.expand?.team?.naam" icon="i-lucide-arrow-left" variant="link" class="mb-2 -ml-2" />
    <h1 class="text-2xl font-bold">Training {{ datumTekst(training.datum) }}</h1>
    <p class="mb-4 text-muted">{{ training.expand?.trainer?.name }}<span v-if="training.afgerond"> · afgerond</span></p>

    <details class="mb-6 rounded-lg border border-default" :open="!trainingOefeningen.length">
      <summary class="flex min-h-12 cursor-pointer items-center px-4 font-semibold">Aanwezig: {{ aantalAanwezig }} van {{ aanwezigheid.length }}</summary>
      <ul class="grid grid-cols-2 gap-2 p-3">
        <li v-for="a in aanwezigheid" :key="a.id">
          <UButton
            :aria-pressed="a.aanwezig" :disabled="!recht.bewerken"
            :icon="a.aanwezig ? 'i-lucide-check' : 'i-lucide-x'" :color="a.aanwezig ? 'primary' : 'neutral'" :variant="a.aanwezig ? 'soft' : 'outline'"
            size="xl" block class="justify-start" :class="{ 'line-through': !a.aanwezig }"
            @click="wissel(a)"
          >
            <span>{{ kindNaam(a.expand?.leerling) }}</span><span class="sr-only">{{ a.aanwezig ? ', aanwezig' : ', afwezig' }}</span>
          </UButton>
        </li>
      </ul>
    </details>

    <section v-for="to in trainingOefeningen" :key="to.id" class="mb-6">
      <div class="mb-2 flex items-baseline justify-between gap-2">
        <h2 class="text-lg font-semibold">{{ to.volgorde }}. {{ to.expand?.oefening?.naam }}</h2>
        <UButton v-if="recht.bewerken" icon="i-lucide-trash-2" color="neutral" variant="ghost" :aria-label="`${to.expand?.oefening?.naam} verwijderen`" @click="verwijderOefening(to)" />
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div v-for="(leden, nr) in groepenVan(to.id)" :key="nr" class="rounded-lg border p-3" :class="Number(nr) === 0 ? 'border-warning' : 'border-default'">
          <h3 class="mb-2 font-medium">{{ Number(nr) === 0 ? 'Nog niet beoordeeld' : `Groepje ${nr}` }} <span class="text-sm text-muted">({{ leden.length }})</span></h3>
          <ul class="flex flex-wrap gap-2">
            <li v-for="r in leden" :key="r.id">
              <UButton :label="kindNaam(r.expand?.leerling)" :aria-label="`${kindNaam(r.expand?.leerling)} verplaatsen`" color="neutral" variant="outline" size="lg"
                :trailing-icon="r.handmatig ? 'i-lucide-hand' : undefined" :disabled="!recht.bewerken" @click="verplaats = r; verplaatsOpen = true" />
            </li>
          </ul>
        </div>
      </div>
    </section>

    <UModal :open="verplaatsOpen" :title="`${kindNaam(verplaats?.expand?.leerling)} verplaatsen naar`" @update:open="v => verplaatsOpen = v">
      <template #body>
        <div class="grid gap-2">
          <UButton v-for="g in doelGroepen" :key="g.n" :label="g.label" size="xl" variant="outline" block @click="verplaatsNaar(g.n)" />
        </div>
      </template>
    </UModal>

    <template v-if="recht.bewerken">
      <h2 class="mb-2 text-lg font-semibold">Oefening toevoegen</h2>
      <div class="mb-6 grid grid-cols-[1fr_7rem] gap-2">
        <USelectMenu v-model="oefeningId" :items="oefeningen.map(o => ({ label: o.naam, value: o.id }))" value-key="value" placeholder="Kies oefening" size="xl" aria-label="Oefening" />
        <UFormField label="Groepsgrootte" class="-mt-6"><UInputNumber v-model="grootte" :min="1" :max="20" size="xl" /></UFormField>
      </div>

      <UFormField label="Notitie bij afronden" class="mb-2">
        <UTextarea v-model="notitie" placeholder="Bijvoorbeeld: trampoline kapot" :rows="2" class="w-full" maxlength="500" />
      </UFormField>
      <UButton :label="training.afgerond ? 'Notitie opslaan' : 'Training afronden'" color="neutral" variant="outline" size="xl" block @click="afronden" />

      <OnderBalk>
        <UButton label="Maak groepjes" icon="i-lucide-users" size="xl" block :loading="bezig" :disabled="!oefeningId || !aantalAanwezig" @click="maakGroepjesVoorOefening" />
      </OnderBalk>
    </template>
  </div>
</template>
