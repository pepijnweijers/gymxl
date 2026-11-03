<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const id = useRoute().params.id as string
const pb = usePb()
const fout = useFout()
const toast = useToast()

const leerling = ref<RecordModel | null>(null)
const aanwezigheid = ref<RecordModel[]>([])
const oefeningen = ref<RecordModel[]>([])
const verloop = ref<Record<string, RecordModel[]>>({}) // skill-naam -> beoordelingen oud -> nieuw
const kanBewerken = ref(false)

onMounted(async () => {
  try {
    const f = pb.filter('leerling = {:id}', { id })
    const [l, a, g, b, teams] = await Promise.all([
      een('leerlingen', id),
      lijst('aanwezigheid', { filter: f, fields: 'aanwezig' }),
      lijst('groepsindeling', { filter: f, sort: '-training_oefening.training.datum', expand: 'training_oefening.oefening,training_oefening.training' }),
      lijst('beoordelingen', { filter: f, sort: 'datum', expand: 'skill,door' }),
      lijst('teams', { filter: pb.filter('team_leerlingen_via_team.leerling ?= {:id}', { id }), expand: TEAM_EXPAND }),
    ])
    leerling.value = l
    aanwezigheid.value = a
    oefeningen.value = g
    for (const r of b) (verloop.value[r.expand?.skill?.naam ?? '?'] ??= []).push(r)
    kanBewerken.value = teams.some(t => teamRecht(t).bewerken)
  } catch (e) { fout(e) }
})

const percentage = computed(() => aanwezigheid.value.length ? Math.round(100 * aanwezigheid.value.filter(a => a.aanwezig).length / aanwezigheid.value.length) : null)

async function opslaan() {
  try {
    const l = leerling.value!
    Object.assign(leerling.value!, await schrijf('leerlingen', 'update', id, { voornaam: l.voornaam, initiaal: l.initiaal, geboortejaar: l.geboortejaar || null, actief: l.actief }))
    toast.add({ title: 'Opgeslagen', color: 'success' })
  } catch (e) { fout(e) }
}
</script>

<template>
  <div v-if="leerling">
    <UButton label="Terug" icon="i-lucide-arrow-left" variant="link" class="mb-2 -ml-2" @click="$router.back()" />
    <h1 class="mb-1 text-2xl font-bold">{{ kindNaam(leerling) }}</h1>
    <p class="mb-6 text-muted">
      <span v-if="leerling.geboortejaar">Geboren in {{ leerling.geboortejaar }} · </span>
      Aanwezig: {{ percentage === null ? 'nog geen trainingen' : `${percentage}% van ${aanwezigheid.length} trainingen` }}
    </p>

    <h2 class="mb-2 text-lg font-semibold">Verloop per skill</h2>
    <p v-if="!Object.keys(verloop).length" class="mb-6 text-muted">Nog niet beoordeeld.</p>
    <ul class="mb-6 space-y-3">
      <li v-for="(lijst, skill) in verloop" :key="skill">
        <div class="flex justify-between gap-2">
          <span class="font-medium">{{ skill }}</span>
          <UBadge :label="`${lijst.at(-1)!.score} ${SCORES[lijst.at(-1)!.score - 1]!.label}`" variant="subtle" />
        </div>
        <ol class="text-sm text-muted">
          <li v-for="b in lijst" :key="b.id">{{ datumTekst(b.datum) }}: {{ b.score }} {{ SCORES[b.score - 1]!.label }} <span>({{ b.expand?.door?.name }})</span></li>
        </ol>
      </li>
    </ul>

    <h2 class="mb-2 text-lg font-semibold">Gedane oefeningen</h2>
    <p v-if="!oefeningen.length" class="mb-6 text-muted">Nog geen oefeningen gedaan.</p>
    <ul class="mb-6 text-sm">
      <li v-for="g in oefeningen" :key="g.id" class="py-1">
        {{ datumTekst(g.expand?.training_oefening?.expand?.training?.datum) }} · {{ g.expand?.training_oefening?.expand?.oefening?.naam }}
        <span class="text-muted">· {{ g.groepsnummer === 0 ? 'niet beoordeeld' : `groepje ${g.groepsnummer}` }}</span>
      </li>
    </ul>

    <details v-if="kanBewerken" class="rounded-lg border border-default">
      <summary class="flex min-h-12 cursor-pointer items-center px-4 font-semibold">Gegevens wijzigen</summary>
      <form class="space-y-3 p-4" @submit.prevent="opslaan">
        <UFormField label="Voornaam" required><UInput v-model="leerling.voornaam" size="xl" class="w-full" /></UFormField>
        <UFormField label="Initiaal achternaam"><UInput v-model="leerling.initiaal" size="xl" class="w-full" maxlength="3" /></UFormField>
        <UFormField label="Geboortejaar"><UInput v-model.number="leerling.geboortejaar" type="number" inputmode="numeric" size="xl" class="w-full" /></UFormField>
        <USwitch v-model="leerling.actief" label="Actief (doet mee aan trainingen)" size="lg" />
        <UButton type="submit" label="Opslaan" size="xl" block />
      </form>
    </details>
  </div>
</template>
