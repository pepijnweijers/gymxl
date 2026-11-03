<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const pb = usePb()
const fout = useFout()
const isAdmin = useIsAdmin()
const oefeningen = ref<RecordModel[]>([])
const skills = ref<RecordModel[]>([])
const laatst = ref<Record<string, RecordModel>>({})

async function laad() {
  try {
    const [o, s, to] = await Promise.all([
      lijst('oefeningen', { sort: 'naam', expand: 'skills' }),
      lijst('skills', { sort: 'categorie,naam' }),
      lijst('training_oefeningen', { sort: '-training.datum', expand: 'training.team' }),
    ])
    oefeningen.value = o
    skills.value = s
    laatst.value = {}
    for (const t of to) laatst.value[t.oefening] ??= t // eerste = nieuwste
  } catch (e) { fout(e) }
}
onMounted(laad)

const leeg = () => ({ id: '', naam: '', uitleg: '', skills: [] as string[] })
const form = ref(leeg())
const open = ref(false)
const bewerk = (o?: RecordModel) => { form.value = o ? { id: o.id, naam: o.naam, uitleg: o.uitleg, skills: [...o.skills] } : leeg(); open.value = true }

async function opslaan() {
  try {
    const { id, ...data } = form.value
    await (id ? pb.collection('oefeningen').update(id, data) : pb.collection('oefeningen').create(data))
    open.value = false
    await laad()
  } catch (e) { fout(e) }
}
async function verwijder() {
  await pb.collection('oefeningen').delete(form.value.id).catch(fout)
  open.value = false
  await laad()
}
</script>

<template>
  <h1 class="mb-4 text-2xl font-bold">Oefeningen</h1>
  <p v-if="!oefeningen.length" class="text-muted">Nog geen oefeningen.</p>
  <ul class="space-y-3">
    <li v-for="o in oefeningen" :key="o.id" class="rounded-lg border border-default p-4">
      <div class="flex items-start justify-between gap-2">
        <h2 class="font-semibold">{{ o.naam }}</h2>
        <UButton v-if="isAdmin" label="Wijzigen" variant="ghost" :aria-label="`${o.naam} wijzigen`" @click="bewerk(o)" />
      </div>
      <p v-if="o.uitleg" class="mb-2 text-sm whitespace-pre-line">{{ o.uitleg }}</p>
      <div class="mb-2 flex flex-wrap gap-1">
        <UBadge v-for="s in o.expand?.skills ?? []" :key="s.id" :label="s.naam" color="neutral" variant="subtle" />
      </div>
      <p class="text-sm text-muted">
        {{ laatst[o.id] ? `Laatst gedaan: ${datumTekst(laatst[o.id]!.expand?.training?.datum)} bij ${laatst[o.id]!.expand?.training?.expand?.team?.naam}` : 'Nog niet gedaan' }}
      </p>
    </li>
  </ul>

  <UModal v-model:open="open" :title="form.id ? 'Oefening wijzigen' : 'Nieuwe oefening'">
    <template #body>
      <form id="oefening" class="space-y-3" @submit.prevent="opslaan">
        <UFormField label="Naam" required><UInput v-model="form.naam" size="xl" class="w-full" /></UFormField>
        <UFormField label="Uitleg"><UTextarea v-model="form.uitleg" :rows="3" class="w-full" /></UFormField>
        <UFormField label="Skills" required>
          <USelectMenu v-model="form.skills" :items="skills.map(s => ({ label: s.naam, value: s.id }))" value-key="value" multiple size="xl" class="w-full" placeholder="Kies skills" />
        </UFormField>
      </form>
    </template>
    <template #footer>
      <UButton v-if="form.id" label="Verwijderen" color="error" variant="ghost" @click="verwijder" />
      <UButton type="submit" form="oefening" label="Opslaan" class="ml-auto" />
    </template>
  </UModal>

  <OnderBalk v-if="isAdmin">
    <UButton label="Nieuwe oefening" icon="i-lucide-plus" size="xl" block @click="bewerk()" />
  </OnderBalk>
</template>
