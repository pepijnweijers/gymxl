<script setup lang="ts">
import type { RecordModel } from 'pocketbase'
definePageMeta({ admin: true })
const pb = usePb()
const fout = useFout()
const toast = useToast()
const user = useUser()
const gebruikers = ref<RecordModel[]>([])
const laad = async () => { gebruikers.value = await pb.collection('users').getFullList({ sort: 'name' }).catch(e => (fout(e), [])) }
onMounted(laad)

const form = reactive({ name: '', email: '', rol: 'trainer' })
async function uitnodigen() {
  try {
    // Tijdelijk willekeurig wachtwoord; de trainer stelt via de e-mail een eigen wachtwoord in.
    const wachtwoord = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')
    await pb.collection('users').create({ ...form, emailVisibility: true, actief: true, password: wachtwoord, passwordConfirm: wachtwoord })
    await pb.collection('users').requestPasswordReset(form.email)
    toast.add({ title: `Uitnodiging verstuurd naar ${form.email}`, color: 'success' })
    Object.assign(form, { name: '', email: '', rol: 'trainer' })
    await laad()
  } catch (e) { fout(e) }
}

async function opnieuw(u: RecordModel) {
  await pb.collection('users').requestPasswordReset(u.email).catch(fout)
  toast.add({ title: `Uitnodiging opnieuw verstuurd naar ${u.email}`, color: 'success' })
}
async function wisselActief(u: RecordModel) {
  try { Object.assign(u, await pb.collection('users').update(u.id, { actief: !u.actief })) } catch (e) { fout(e) }
}
</script>

<template>
  <h1 class="mb-4 text-2xl font-bold">Gebruikers</h1>
  <ul class="mb-8 divide-y divide-default rounded-lg border border-default">
    <li v-for="u in gebruikers" :key="u.id" class="flex flex-wrap items-center gap-2 px-4 py-2">
      <div class="min-w-0 flex-1">
        <div class="font-medium" :class="{ 'text-muted line-through': !u.actief }">{{ u.name }} <UBadge :label="u.rol" color="neutral" variant="subtle" /></div>
        <div class="truncate text-sm text-muted">{{ u.email }}<span v-if="!u.actief"> · geblokkeerd</span></div>
      </div>
      <template v-if="u.id !== user?.id">
        <UButton label="Uitnodigen" variant="ghost" :aria-label="`${u.name} opnieuw uitnodigen`" @click="opnieuw(u)" />
        <UButton :label="u.actief ? 'Blokkeren' : 'Deblokkeren'" :color="u.actief ? 'error' : 'primary'" variant="ghost" :aria-label="`${u.name} ${u.actief ? 'blokkeren' : 'deblokkeren'}`" @click="wisselActief(u)" />
      </template>
    </li>
  </ul>

  <h2 class="mb-2 text-lg font-semibold">Trainer uitnodigen</h2>
  <form class="space-y-3" @submit.prevent="uitnodigen">
    <UFormField label="Naam" required><UInput v-model="form.name" size="xl" class="w-full" required /></UFormField>
    <UFormField label="E-mail" required><UInput v-model="form.email" type="email" size="xl" class="w-full" required /></UFormField>
    <UFormField label="Rol"><USelect v-model="form.rol" :items="[{ label: 'Trainer', value: 'trainer' }, { label: 'Admin', value: 'admin' }]" size="xl" class="w-full" /></UFormField>
    <UButton type="submit" label="Uitnodiging versturen" size="xl" block />
  </form>
</template>
