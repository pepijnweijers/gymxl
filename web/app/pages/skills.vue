<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const pb = usePb()
const fout = useFout()
const isAdmin = useIsAdmin()
const skills = ref<RecordModel[]>([])
const laad = async () => { skills.value = await lijst('skills', { sort: 'categorie,naam' }).catch(e => (fout(e), [])) }
onMounted(laad)

const leeg = () => ({ id: '', naam: '', omschrijving: '', categorie: '' })
const form = ref(leeg())
const open = ref(false)
const bewerk = (s?: RecordModel) => { form.value = s ? { id: s.id, naam: s.naam, omschrijving: s.omschrijving, categorie: s.categorie } : leeg(); open.value = true }

async function opslaan() {
  try {
    const { id, ...data } = form.value
    await (id ? pb.collection('skills').update(id, data) : pb.collection('skills').create(data))
    open.value = false
    await laad()
  } catch (e) { fout(e) }
}
async function verwijder() {
  // Beoordelingen van deze skill worden mee verwijderd (cascade)
  await pb.collection('skills').delete(form.value.id).catch(fout)
  open.value = false
  await laad()
}
</script>

<template>
  <h1 class="mb-1 text-2xl font-bold">Skills</h1>
  <p class="mb-4 text-sm text-muted">Schaal: {{ SCORES.map(s => `${s.waarde} ${s.label.toLowerCase()}`).join(', ') }}</p>
  <p v-if="!skills.length" class="text-muted">Nog geen skills.</p>
  <ul class="divide-y divide-default rounded-lg border border-default">
    <li v-for="s in skills" :key="s.id" class="flex min-h-14 items-center gap-2 px-4 py-2">
      <div class="flex-1">
        <div class="font-medium">{{ s.naam }} <span v-if="s.categorie" class="text-sm font-normal text-muted">· {{ s.categorie }}</span></div>
        <div v-if="s.omschrijving" class="text-sm text-muted">{{ s.omschrijving }}</div>
      </div>
      <UButton v-if="isAdmin" label="Wijzigen" variant="ghost" :aria-label="`${s.naam} wijzigen`" @click="bewerk(s)" />
    </li>
  </ul>

  <UModal v-model:open="open" :title="form.id ? 'Skill wijzigen' : 'Nieuwe skill'">
    <template #body>
      <form id="skill" class="space-y-3" @submit.prevent="opslaan">
        <UFormField label="Naam" required><UInput v-model="form.naam" size="xl" class="w-full" /></UFormField>
        <UFormField label="Korte omschrijving"><UInput v-model="form.omschrijving" size="xl" class="w-full" /></UFormField>
        <UFormField label="Categorie" hint="Bijvoorbeeld vloer of trampoline"><UInput v-model="form.categorie" size="xl" class="w-full" /></UFormField>
      </form>
    </template>
    <template #footer>
      <UButton v-if="form.id" label="Verwijderen" color="error" variant="ghost" @click="verwijder" />
      <UButton type="submit" form="skill" label="Opslaan" class="ml-auto" />
    </template>
  </UModal>

  <OnderBalk v-if="isAdmin">
    <UButton label="Nieuwe skill" icon="i-lucide-plus" size="xl" block @click="bewerk()" />
  </OnderBalk>
</template>
