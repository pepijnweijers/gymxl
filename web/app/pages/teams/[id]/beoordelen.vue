<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const id = useRoute().params.id as string
const pb = usePb()
const user = useUser()
const fout = useFout()
const toast = useToast()

const team = ref<RecordModel | null>(null)
const kinderen = ref<RecordModel[]>([])
const skills = ref<RecordModel[]>([])
const scores = ref<Record<string, { score: number; datum: string }>>({}) // `${leerling}:${skill}`
const index = ref(0)
const kind = computed(() => kinderen.value[index.value])

onMounted(async () => {
  try {
    const [t, k, s, h] = await Promise.all([
      een('teams', id, { expand: TEAM_EXPAND }),
      lijst('team_leerlingen', { filter: pb.filter('team = {:id}', { id }), expand: 'leerling', sort: 'leerling.voornaam' }, d => d.team === id),
      lijst('skills', { sort: 'categorie,naam' }),
      huidigeScores(id),
    ])
    team.value = t
    kinderen.value = k.map(x => x.expand!.leerling).filter(l => l?.actief !== false)
    skills.value = s
    for (const r of h) scores.value[`${r.leerling}:${r.skill}`] = { score: r.score, datum: r.datum }
  } catch (e) { fout(e) }
})

const perCategorie = computed(() => {
  const groepen: Record<string, RecordModel[]> = {}
  for (const s of skills.value) (groepen[s.categorie || 'Overig'] ??= []).push(s)
  return groepen
})

// Tikken op sterren is een concept; pas bij "Klaar" wordt alles opgeslagen (een misklik komt zo niet in het verloop).
const concept = ref<Record<string, number>>({}) // `${leerling}:${skill}` -> sterren
const aantalConcept = computed(() => Object.keys(concept.value).length)
const sleutel = (skill: RecordModel) => `${kind.value!.id}:${skill.id}`
const getoond = (skill: RecordModel) => concept.value[sleutel(skill)] ?? scores.value[sleutel(skill)]?.score ?? 0

function kies(skill: RecordModel, n: number) {
  const k = sleutel(skill)
  // Nog eens op dezelfde ster tikken, of terug naar de opgeslagen score: concept weg.
  if (concept.value[k] === n || scores.value[k]?.score === n) delete concept.value[k]
  else concept.value[k] = n
}

const bezig = ref(false)
async function klaar() {
  bezig.value = true
  let opgeslagen = 0
  for (const [k, score] of Object.entries(concept.value)) {
    const [leerling, skill] = k.split(':')
    try {
      // shortcut: offline krijgt de beoordeling de datum van het versturen (autodate op de server); prima zolang offline kort duurt.
      const r = await schrijf('beoordelingen', 'create', null, { leerling, skill, score, door: user.value!.id })
      scores.value[k] = { score, datum: r.datum ?? new Date().toISOString() }
      delete concept.value[k]
      opgeslagen++
    } catch (e) { fout(e) }
  }
  bezig.value = false
  if (opgeslagen) toast.add({ title: `${opgeslagen} ${opgeslagen === 1 ? 'beoordeling' : 'beoordelingen'} opgeslagen`, color: 'success' })
  if (!aantalConcept.value) await navigateTo(`/teams/${id}`)
}

// Niet ongemerkt weggaan met niet-opgeslagen sterren
onBeforeRouteLeave(() => aantalConcept.value === 0 || bezig.value || confirm(`${aantalConcept.value} beoordeling(en) zijn nog niet opgeslagen. Toch weggaan?`))
const waarschuw = (e: BeforeUnloadEvent) => { if (aantalConcept.value) e.preventDefault() }
onMounted(() => window.addEventListener('beforeunload', waarschuw))
onBeforeUnmount(() => window.removeEventListener('beforeunload', waarschuw))
</script>

<template>
  <div v-if="team">
    <UButton :to="`/teams/${id}`" :label="team.naam" icon="i-lucide-arrow-left" variant="link" class="mb-2 -ml-2" />
    <h1 class="mb-4 text-2xl font-bold">Beoordelen</h1>
    <p v-if="!kinderen.length" class="text-muted">Dit team heeft nog geen leerlingen.</p>
    <p v-else-if="!skills.length" class="text-muted">Er zijn nog geen skills. De admin maakt ze aan bij Skills.</p>
    <template v-else-if="kind">
      <USelect v-model="index" :items="kinderen.map((k, i) => ({ label: kindNaam(k), value: i }))" size="xl" class="mb-4 w-full" aria-label="Kind kiezen" />

      <section v-for="(lijst, cat) in perCategorie" :key="cat" class="mb-6">
        <h2 class="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{{ cat }}</h2>
        <div v-for="s in lijst" :key="s.id" class="mb-4">
          <div class="mb-1 flex items-baseline justify-between gap-2">
            <span class="font-medium">{{ s.naam }}</span>
            <span class="text-xs text-muted">
              <template v-if="concept[`${kind.id}:${s.id}`]"><strong class="text-default">{{ concept[`${kind.id}:${s.id}`] }}/{{ MAX_STERREN }} · nog niet opgeslagen</strong></template>
              <template v-else-if="scores[`${kind.id}:${s.id}`]">{{ scores[`${kind.id}:${s.id}`]!.score }}/{{ MAX_STERREN }} · {{ datumTekst(scores[`${kind.id}:${s.id}`]!.datum) }}</template>
              <template v-else>Nog niet beoordeeld</template>
            </span>
          </div>
          <p v-if="s.omschrijving" class="mb-1 text-sm text-muted">{{ s.omschrijving }}</p>
          <div class="flex gap-1" role="group" :aria-label="`${s.naam} voor ${kindNaam(kind)}`">
            <UButton
              v-for="n in MAX_STERREN" :key="n"
              :aria-label="sterrenTekst(n)"
              :aria-pressed="getoond(s) === n"
              color="primary" variant="ghost" size="xl" class="size-14 justify-center p-2"
              @click="kies(s, n)"
            >
              <Ster :vol="n <= getoond(s)" />
            </UButton>
          </div>
        </div>
      </section>

      <OnderBalk>
        <UButton icon="i-lucide-chevron-left" color="neutral" variant="outline" size="xl" aria-label="Vorige kind" :disabled="index === 0" @click="index--" />
        <UButton v-if="index < kinderen.length - 1" :label="kindNaam(kinderen[index + 1])" :aria-label="`Volgende kind: ${kindNaam(kinderen[index + 1])}`"
          trailing-icon="i-lucide-chevron-right" color="neutral" variant="outline" size="xl" class="min-w-0 flex-1 justify-between" @click="index++" />
        <UButton :label="aantalConcept ? `Klaar (${aantalConcept})` : 'Klaar'" icon="i-lucide-check" size="xl" :loading="bezig"
          :class="index < kinderen.length - 1 ? '' : 'flex-1 justify-center'" @click="klaar" />
      </OnderBalk>
    </template>
  </div>
</template>
