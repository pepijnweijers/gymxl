<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const id = useRoute().params.id as string
const pb = usePb()
const user = useUser()
const fout = useFout()

const team = ref<RecordModel | null>(null)
const kinderen = ref<RecordModel[]>([])
const trainingen = ref<RecordModel[]>([])
const aanwezigheid = ref<RecordModel[]>([])
const scores = ref<RecordModel[]>([])
const recht = computed(() => teamRecht(team.value))

onMounted(async () => {
  try {
    const f = pb.filter('team = {:id}', { id })
    ;[team.value, kinderen.value, trainingen.value, aanwezigheid.value, scores.value] = await Promise.all([
      een('teams', id, { expand: TEAM_EXPAND }),
      lijst('team_leerlingen', { filter: f, expand: 'leerling', sort: 'leerling.voornaam' }, d => d.team === id),
      lijst('trainingen', { filter: f, sort: '-datum', fields: 'id,datum,afgerond' }, d => d.team === id),
      lijst('aanwezigheid', { filter: pb.filter('training.team = {:id}', { id }), fields: 'aanwezig' }),
      huidigeScores(id),
    ])
  } catch (e) { fout(e) }
})

const openTraining = computed(() => trainingen.value.find(t => !t.afgerond))
const procent = (deel: number, totaal: number) => totaal ? `${Math.round(100 * deel / totaal)}%` : '–'

// Herinnering: laatste beoordeling ouder dan 30 dagen (of nooit)
const teBeoordelen = computed(() => {
  const laatste: Record<string, string> = {}
  for (const s of scores.value) if (s.datum > (laatste[s.leerling] ?? '')) laatste[s.leerling] = s.datum
  const grens = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().replace('T', ' ')
  return kinderen.value.filter(k => !laatste[k.leerling] || laatste[k.leerling]! < grens).length
})

const stats = computed(() => [
  { label: 'Leerlingen', waarde: kinderen.value.length, sub: '' },
  { label: 'Trainingen', waarde: trainingen.value.length, sub: trainingen.value[0] ? `laatst ${datumTekst(trainingen.value[0].datum)}` : '' },
  { label: 'Aanwezigheid', waarde: procent(aanwezigheid.value.filter(a => a.aanwezig).length, aanwezigheid.value.length), sub: 'gemiddeld' },
  { label: 'Beheerst', waarde: procent(scores.value.filter(s => s.score === 3).length, scores.value.length), sub: `van ${scores.value.length} skillscores` },
])

async function startTraining() {
  try {
    const t = await schrijf('trainingen', 'create', null, { team: id, datum: new Date().toISOString(), trainer: user.value!.id, afgerond: false }, { team: team.value, trainer: user.value })
    await Promise.all(kinderen.value.filter(k => k.expand?.leerling?.actief !== false).map(k =>
      schrijf('aanwezigheid', 'create', null, { training: t.id, leerling: k.leerling, aanwezig: true }, { leerling: k.expand?.leerling })))
    await navigateTo(`/training/${t.id}`)
  } catch (e) { fout(e) }
}

const links = computed(() => [
  { to: `/teams/${id}/leerlingen`, label: 'Leerlingen', icon: 'i-lucide-users', toon: true },
  { to: `/teams/${id}/beoordelen`, label: 'Beoordelen', icon: 'i-lucide-clipboard-check', toon: recht.value.bewerken },
  { to: `/teams/${id}/geschiedenis`, label: 'Geschiedenis', icon: 'i-lucide-history', toon: true },
  { to: `/teams/${id}/delen`, label: 'Delen en instellingen', icon: 'i-lucide-share-2', toon: recht.value.eigenaar },
].filter(l => l.toon))
</script>

<template>
  <div v-if="team">
    <h1 class="mb-4 text-2xl font-bold">{{ team.naam }}</h1>

    <dl class="mb-4 grid grid-cols-2 gap-2">
      <div v-for="s in stats" :key="s.label" class="rounded-lg border border-default p-3">
        <dt class="text-sm text-muted">{{ s.label }}</dt>
        <dd class="text-2xl font-semibold tabular-nums">{{ s.waarde }}</dd>
        <dd v-if="s.sub" class="text-xs text-muted">{{ s.sub }}</dd>
      </div>
    </dl>

    <NuxtLink v-if="teBeoordelen && recht.bewerken" :to="`/teams/${id}/beoordelen`"
      class="mb-4 flex min-h-12 items-center gap-2 rounded-lg border border-warning px-3 py-2 text-sm">
      <UIcon name="i-lucide-clock" class="size-5 shrink-0 text-warning" />
      <span><strong>{{ teBeoordelen }}</strong> {{ teBeoordelen === 1 ? 'kind is' : 'kinderen zijn' }} meer dan 30 dagen niet beoordeeld</span>
    </NuxtLink>

    <nav aria-label="Team" class="divide-y divide-default rounded-lg border border-default">
      <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="flex min-h-14 items-center gap-3 px-4 hover:bg-elevated">
        <UIcon :name="l.icon" class="size-5 text-muted" />
        <span class="flex-1 font-medium">{{ l.label }}</span>
        <UIcon name="i-lucide-chevron-right" class="size-5 text-muted" />
      </NuxtLink>
    </nav>

    <OnderBalk v-if="recht.bewerken">
      <UButton v-if="openTraining" :to="`/training/${openTraining.id}`" label="Verder met training" icon="i-lucide-play" size="xl" block />
      <UButton v-else label="Training starten" icon="i-lucide-play" size="xl" block :disabled="!kinderen.length" @click="startTraining" />
    </OnderBalk>
  </div>
</template>
