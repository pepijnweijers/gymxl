<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
definePageMeta({ admin: true })
const pb = usePb()
const fout = useFout()
const toast = useToast()
const user = useUser()

const whitelist = ref<RecordModel[]>([])
const gebruikers = ref<RecordModel[]>([])
const groepen = ref<RecordModel[]>([])
const ROLLEN = [{ label: 'Trainer', value: 'trainer' }, { label: 'Admin', value: 'admin' }]

async function laad() {
  try {
    ;[whitelist.value, gebruikers.value, groepen.value] = await Promise.all([
      pb.collection('whitelist').getFullList({ sort: 'email' }),
      pb.collection('users').getFullList({ sort: 'name' }),
      pb.collection('trainersgroepen').getFullList({ sort: 'naam' }),
    ])
  } catch (e) { fout(e) }
}
onMounted(laad)

// Whitelist: wie zelf een account mag maken, en met welke rol
const nieuwEmail = ref('')
const nieuwRol = ref('trainer')
const heeftAccount = (email: string) => gebruikers.value.some(u => u.email === email)
async function toevoegen() {
  try {
    await pb.collection('whitelist').create({ email: nieuwEmail.value.trim().toLowerCase(), rol: nieuwRol.value })
    toast.add({ title: `${nieuwEmail.value} kan nu een account maken`, description: `Stuur de link ${location.origin}/registreren`, color: 'success' })
    nieuwEmail.value = ''
    await laad()
  } catch (e) { fout(e) }
}
async function verwijderWhitelist(w: RecordModel) {
  await pb.collection('whitelist').delete(w.id).catch(fout)
  await laad()
}

// Gebruikers
async function wijzig(u: RecordModel, data: Record<string, any>) {
  try { Object.assign(u, await pb.collection('users').update(u.id, data)) } catch (e) { fout(e) }
}
const tijdelijk = ref<{ naam: string; wachtwoord: string } | null>(null)
async function tijdelijkWachtwoord(u: RecordModel) {
  // Er is geen mail: de admin geeft het tijdelijke wachtwoord persoonlijk door.
  const wachtwoord = Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(36).padStart(2, '0')).join('').slice(0, 10)
  try {
    await pb.collection('users').update(u.id, { password: wachtwoord, passwordConfirm: wachtwoord })
    tijdelijk.value = { naam: u.name, wachtwoord }
  } catch (e) { fout(e) }
}

// Trainersgroepen
const groepNaam = ref('')
async function maakGroep() {
  if (!groepNaam.value.trim()) return
  await pb.collection('trainersgroepen').create({ naam: groepNaam.value.trim(), leden: [] }).catch(fout)
  groepNaam.value = ''
  await laad()
}
async function zetLeden(g: RecordModel, leden: string[]) {
  try { Object.assign(g, await pb.collection('trainersgroepen').update(g.id, { leden })) } catch (e) { fout(e) }
}
async function verwijderGroep(g: RecordModel) {
  await pb.collection('trainersgroepen').delete(g.id).catch(fout)
  toast.add({ title: `Groep ${g.naam} verwijderd` })
  await laad()
}
const gebruikerKeuze = computed(() => gebruikers.value.filter(u => u.actief).map(u => ({ label: u.name, value: u.id })))

const tabs = [
  { label: 'Toegang', slot: 'toegang' as const, icon: 'i-lucide-list-checks' },
  { label: 'Gebruikers', slot: 'gebruikers' as const, icon: 'i-lucide-users' },
  { label: 'Groepen', slot: 'groepen' as const, icon: 'i-lucide-users-round' },
]
</script>

<template>
  <h1 class="mb-4 text-2xl font-bold">Beheer</h1>
  <UTabs :items="tabs" class="w-full" size="lg">
    <template #toegang>
      <p class="mb-3 text-sm text-muted">Alleen deze e-mailadressen kunnen zelf een account maken via <strong>/registreren</strong>. De rol bepaal je hier.</p>
      <form class="mb-4 grid grid-cols-[1fr_auto] gap-2" @submit.prevent="toevoegen">
        <UInput v-model="nieuwEmail" type="email" placeholder="E-mail" aria-label="E-mail toevoegen" size="xl" required />
        <USelect v-model="nieuwRol" :items="ROLLEN" size="xl" aria-label="Rol" />
        <UButton type="submit" label="Toevoegen" icon="i-lucide-plus" size="xl" class="col-span-2" block />
      </form>
      <ul class="divide-y divide-default rounded-lg border border-default">
        <li v-for="w in whitelist" :key="w.id" class="flex min-h-12 items-center gap-2 px-3">
          <span class="min-w-0 flex-1 truncate">{{ w.email }}</span>
          <UBadge :label="w.rol" color="neutral" variant="subtle" />
          <UBadge v-if="heeftAccount(w.email)" label="Account" icon="i-lucide-check" color="success" variant="subtle" />
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="`${w.email} van de lijst halen`" @click="verwijderWhitelist(w)" />
        </li>
        <li v-if="!whitelist.length" class="px-3 py-3 text-muted">Nog niemand toegevoegd.</li>
      </ul>
    </template>

    <template #gebruikers>
      <ul class="divide-y divide-default rounded-lg border border-default">
        <li v-for="u in gebruikers" :key="u.id" class="space-y-2 px-3 py-3">
          <div :class="{ 'text-muted line-through': !u.actief }">
            <span class="font-medium">{{ u.name }}</span>
            <span class="block truncate text-sm text-muted">{{ u.email }}<span v-if="!u.actief"> · geblokkeerd</span></span>
          </div>
          <div v-if="u.id !== user?.id" class="flex flex-wrap gap-2">
            <USelect :model-value="u.rol" :items="ROLLEN" :aria-label="`Rol van ${u.name}`" @update:model-value="rol => wijzig(u, { rol })" />
            <UButton label="Tijdelijk wachtwoord" variant="outline" color="neutral" @click="tijdelijkWachtwoord(u)" />
            <UButton :label="u.actief ? 'Blokkeren' : 'Deblokkeren'" :color="u.actief ? 'error' : 'primary'" variant="ghost" @click="wijzig(u, { actief: !u.actief })" />
          </div>
        </li>
      </ul>
    </template>

    <template #groepen>
      <p class="mb-3 text-sm text-muted">Een team kan gedeeld worden met een hele groep trainers.</p>
      <form class="mb-4 flex gap-2" @submit.prevent="maakGroep">
        <UInput v-model="groepNaam" placeholder="Naam groep" aria-label="Naam nieuwe groep" size="xl" class="flex-1" />
        <UButton type="submit" label="Maken" icon="i-lucide-plus" size="xl" />
      </form>
      <div v-for="g in groepen" :key="g.id" class="mb-3 rounded-lg border border-default p-3">
        <div class="mb-2 flex items-center justify-between">
          <h3 class="font-semibold">{{ g.naam }}</h3>
          <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" :aria-label="`Groep ${g.naam} verwijderen`" @click="verwijderGroep(g)" />
        </div>
        <USelectMenu :model-value="g.leden" :items="gebruikerKeuze" value-key="value" multiple placeholder="Kies trainers" size="lg" class="w-full"
          :aria-label="`Leden van ${g.naam}`" @update:model-value="(leden: string[]) => zetLeden(g, leden)" />
      </div>
    </template>
  </UTabs>

  <UModal :open="!!tijdelijk" title="Tijdelijk wachtwoord" @update:open="v => { if (!v) tijdelijk = null }">
    <template #body>
      <p class="mb-3">Geef dit wachtwoord persoonlijk door aan {{ tijdelijk?.naam }}. Laat het daarna wijzigen bij Mijn account.</p>
      <p class="rounded-lg bg-elevated p-3 text-center font-mono text-2xl tracking-wider select-all">{{ tijdelijk?.wachtwoord }}</p>
    </template>
  </UModal>
</template>
