<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const id = useRoute().params.id as string
const pb = usePb()
const fout = useFout()

const team = ref<RecordModel | null>(null)
const trainingen = ref<RecordModel[]>([])
const aanwezig = ref<Record<string, number>>({})
const oefeningen = ref<Record<string, RecordModel[]>>({})
const groepen = ref<Record<string, Record<number, RecordModel[]>>>({})

onMounted(async () => {
  try {
    const f = pb.filter('team = {:id}', { id })
    const [t, tr, a, to, g] = await Promise.all([
      een('teams', id),
      lijst('trainingen', { filter: f, sort: '-datum', expand: 'trainer' }),
      lijst('aanwezigheid', { filter: pb.filter('training.team = {:id} && aanwezig = true', { id }), fields: 'training' }),
      lijst('training_oefeningen', { filter: pb.filter('training.team = {:id}', { id }), sort: 'volgorde', expand: 'oefening' }),
      lijst('groepsindeling', { filter: pb.filter('training_oefening.training.team = {:id}', { id }), expand: 'leerling', sort: 'leerling.voornaam' }),
    ])
    team.value = t
    trainingen.value = tr
    for (const x of a) aanwezig.value[x.training] = (aanwezig.value[x.training] ?? 0) + 1
    for (const x of to) (oefeningen.value[x.training] ??= []).push(x)
    for (const x of g) ((groepen.value[x.training_oefening] ??= {})[x.groepsnummer] ??= []).push(x.expand!.leerling)
  } catch (e) { fout(e) }
})
</script>

<template>
  <div v-if="team">
    <UButton :to="`/teams/${id}`" :label="team.naam" icon="i-lucide-arrow-left" variant="link" class="mb-2 -ml-2" />
    <h1 class="mb-4 text-2xl font-bold">Geschiedenis</h1>
    <p v-if="!trainingen.length" class="text-muted">Nog geen trainingen.</p>
    <article v-for="t in trainingen" :key="t.id" class="mb-4 rounded-lg border border-default p-4">
      <header class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <NuxtLink :to="`/training/${t.id}`" class="font-semibold underline-offset-2 hover:underline">{{ datumTekst(t.datum) }}</NuxtLink>
        <span class="text-sm text-muted">{{ t.expand?.trainer?.name }} · {{ aanwezig[t.id] ?? 0 }} aanwezig</span>
      </header>
      <p v-if="t.notitie" class="mb-2 text-sm italic">{{ t.notitie }}</p>
      <div v-for="o in oefeningen[t.id] ?? []" :key="o.id" class="mb-2">
        <h3 class="font-medium">{{ o.expand?.oefening?.naam }}</h3>
        <ul class="text-sm">
          <li v-for="(kids, nr) in groepen[o.id]" :key="nr">
            <span class="text-muted">{{ Number(nr) === 0 ? 'Niet beoordeeld' : `Groepje ${nr}` }}:</span> {{ kids.map(kindNaam).join(', ') }}
          </li>
        </ul>
      </div>
    </article>
  </div>
</template>
