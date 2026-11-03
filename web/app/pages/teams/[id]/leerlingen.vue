<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
const id = useRoute().params.id as string
const pb = usePb()
const fout = useFout()
const toast = useToast()

const team = ref<RecordModel | null>(null)
const koppelingen = ref<RecordModel[]>([])
const alleLeerlingen = ref<RecordModel[]>([])
const recht = computed(() => teamRecht(team.value))

async function laad() {
  try {
    ;[team.value, koppelingen.value, alleLeerlingen.value] = await Promise.all([
      een('teams', id, { expand: TEAM_EXPAND }),
      lijst('team_leerlingen', { filter: pb.filter('team = {:id}', { id }), expand: 'leerling', sort: 'leerling.voornaam' }, d => d.team === id),
      lijst('leerlingen', { sort: 'voornaam' }),
    ])
  } catch (e) { fout(e) }
}
onMounted(laad)

const nieuwOpen = ref(false)
const nieuw = reactive({ voornaam: '', initiaal: '', geboortejaar: undefined as number | undefined })
async function voegToe() {
  if (!nieuw.voornaam.trim()) return
  try {
    const l = await schrijf('leerlingen', 'create', null, { ...nieuw, voornaam: nieuw.voornaam.trim(), actief: true })
    const k = await schrijf('team_leerlingen', 'create', null, { team: id, leerling: l.id }, { leerling: l })
    koppelingen.value.push({ ...k, expand: { leerling: l } })
    Object.assign(nieuw, { voornaam: '', initiaal: '', geboortejaar: undefined })
    nieuwOpen.value = false
    toast.add({ title: `${kindNaam(l)} toegevoegd`, color: 'success' })
  } catch (e) { fout(e) }
}

const bestaandeKeuze = computed(() => alleLeerlingen.value
  .filter(l => !koppelingen.value.some(k => k.leerling === l.id))
  .map(l => ({ label: `${kindNaam(l)}${l.geboortejaar ? ` (${l.geboortejaar})` : ''}`, value: l.id })))
const bestaande = ref<string>()
async function voegBestaandeToe() {
  const l = alleLeerlingen.value.find(l => l.id === bestaande.value)
  if (!l) return
  try {
    const k = await schrijf('team_leerlingen', 'create', null, { team: id, leerling: l.id }, { leerling: l })
    koppelingen.value.push({ ...k, expand: { leerling: l } })
    bestaande.value = undefined
  } catch (e) { fout(e) }
}

async function verwijder(k: RecordModel) {
  try {
    await schrijf('team_leerlingen', 'delete', k.id)
    koppelingen.value = koppelingen.value.filter(x => x.id !== k.id)
    toast.add({
      title: `${kindNaam(k.expand?.leerling)} uit team verwijderd`,
      actions: [{ label: 'Ongedaan maken', onClick: async () => {
        const terug = await schrijf('team_leerlingen', 'create', null, { team: id, leerling: k.leerling }, k.expand).catch(fout)
        if (terug) koppelingen.value.push({ ...terug, expand: k.expand })
      } }],
    })
  } catch (e) { fout(e) }
}
</script>

<template>
  <div v-if="team">
    <UButton :to="`/teams/${id}`" :label="team.naam" icon="i-lucide-arrow-left" variant="link" class="mb-2 -ml-2" />
    <h1 class="mb-4 text-2xl font-bold">Leerlingen ({{ koppelingen.length }})</h1>

    <ul class="mb-6 divide-y divide-default rounded-lg border border-default">
      <li v-for="k in koppelingen" :key="k.id" class="flex min-h-14 items-center gap-2 px-3">
        <NuxtLink :to="`/leerlingen/${k.leerling}`" class="flex-1 py-3 font-medium">
          {{ kindNaam(k.expand?.leerling) }}
          <span v-if="k.expand?.leerling?.geboortejaar" class="text-sm font-normal text-muted">· {{ k.expand.leerling.geboortejaar }}</span>
        </NuxtLink>
        <UButton v-if="recht.bewerken" icon="i-lucide-x" color="neutral" variant="ghost" size="lg" :aria-label="`${kindNaam(k.expand?.leerling)} uit team verwijderen`" @click="verwijder(k)" />
      </li>
      <li v-if="!koppelingen.length" class="px-3 py-3 text-muted">Nog geen leerlingen.</li>
    </ul>

    <template v-if="recht.bewerken">
      <UModal v-model:open="nieuwOpen" title="Nieuwe leerling" description="Alleen voornaam, eventueel een initiaal en het geboortejaar.">
        <template #body>
          <form id="nieuwe-leerling" class="space-y-3" @submit.prevent="voegToe">
            <UFormField label="Voornaam" required><UInput v-model="nieuw.voornaam" size="xl" class="w-full" required /></UFormField>
            <UFormField label="Initiaal achternaam"><UInput v-model="nieuw.initiaal" size="xl" class="w-full" maxlength="3" /></UFormField>
            <UFormField label="Geboortejaar"><UInput v-model.number="nieuw.geboortejaar" type="number" inputmode="numeric" size="xl" class="w-full" /></UFormField>
          </form>
        </template>
        <template #footer>
          <UButton label="Annuleren" color="neutral" variant="outline" @click="nieuwOpen = false" />
          <UButton type="submit" form="nieuwe-leerling" label="Toevoegen" class="ml-auto" />
        </template>
      </UModal>
      <OnderBalk>
        <UButton label="Nieuwe leerling" icon="i-lucide-plus" size="xl" block @click="nieuwOpen = true" />
      </OnderBalk>
      <template v-if="bestaandeKeuze.length">
        <h2 class="mb-2 text-lg font-semibold">Uit een ander team</h2>
        <div class="flex gap-2">
          <USelectMenu v-model="bestaande" :items="bestaandeKeuze" value-key="value" placeholder="Kies leerling" size="xl" class="flex-1" />
          <UButton label="Toevoegen" size="xl" variant="outline" :disabled="!bestaande" @click="voegBestaandeToe" />
        </div>
      </template>
    </template>
  </div>
</template>
