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

async function geef(skill: RecordModel, score: number) {
  const l = kind.value!
  try {
    // shortcut: offline krijgt de beoordeling de datum van het versturen (autodate op de server); prima zolang offline kort duurt.
    const r = await schrijf('beoordelingen', 'create', null, { leerling: l.id, skill: skill.id, score, door: user.value!.id })
    scores.value[`${l.id}:${skill.id}`] = { score, datum: r.datum ?? new Date().toISOString() }
    toast.add({ title: `${kindNaam(l)}: ${skill.naam} → ${SCORES[score - 1]!.label}`, color: 'success', duration: 1500 })
  } catch (e) { fout(e) }
}
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
            <span v-if="scores[`${kind.id}:${s.id}`]" class="text-xs text-muted">{{ datumTekst(scores[`${kind.id}:${s.id}`]!.datum) }}</span>
          </div>
          <p v-if="s.omschrijving" class="mb-1 text-sm text-muted">{{ s.omschrijving }}</p>
          <div class="grid grid-cols-3 gap-2" role="group" :aria-label="`${s.naam} voor ${kindNaam(kind)}`">
            <UButton
              v-for="o in SCORES" :key="o.waarde"
              :label="`${o.waarde} ${o.label}`"
              :aria-pressed="scores[`${kind.id}:${s.id}`]?.score === o.waarde"
              :variant="scores[`${kind.id}:${s.id}`]?.score === o.waarde ? 'solid' : 'outline'"
              :icon="scores[`${kind.id}:${s.id}`]?.score === o.waarde ? 'i-lucide-check' : undefined"
              size="xl" block class="justify-center"
              @click="geef(s, o.waarde)"
            />
          </div>
        </div>
      </section>

      <OnderBalk>
        <UButton label="Vorige" icon="i-lucide-chevron-left" color="neutral" variant="outline" size="xl" :disabled="index === 0" @click="index--" />
        <UButton :label="index < kinderen.length - 1 ? `Volgende: ${kindNaam(kinderen[index + 1])}` : 'Klaar'" trailing-icon="i-lucide-chevron-right" size="xl" block
          @click="index < kinderen.length - 1 ? index++ : navigateTo(`/teams/${id}`)" />
      </OnderBalk>
    </template>
  </div>
</template>
