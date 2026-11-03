<script setup lang="ts">
const pb = usePb()
const user = useUser()
const fout = useFout()
const toast = useToast()
const naam = ref(user.value?.name ?? '')
const pw = reactive({ oud: '', nieuw: '' })

async function bewaarNaam() {
  await pb.collection('users').update(user.value!.id, { name: naam.value.trim() })
    .then(() => toast.add({ title: 'Opgeslagen', color: 'success' })).catch(fout)
}

async function wijzigWachtwoord() {
  try {
    await pb.collection('users').update(user.value!.id, { oldPassword: pw.oud, password: pw.nieuw, passwordConfirm: pw.nieuw })
    // Na een wachtwoordwijziging is de sessie ongeldig: opnieuw inloggen.
    await pb.collection('users').authWithPassword(user.value!.email, pw.nieuw)
    Object.assign(pw, { oud: '', nieuw: '' })
    toast.add({ title: 'Wachtwoord gewijzigd', color: 'success' })
  } catch (e) { fout(e) }
}
</script>

<template>
  <h1 class="mb-1 text-2xl font-bold">Mijn account</h1>
  <p class="mb-6 text-muted">{{ user?.email }} · {{ user?.rol }}</p>

  <form class="mb-8 space-y-3" @submit.prevent="bewaarNaam">
    <UFormField label="Naam" required><UInput v-model="naam" size="xl" class="w-full" required /></UFormField>
    <UButton type="submit" label="Naam opslaan" size="xl" variant="outline" block />
  </form>

  <h2 class="mb-2 text-lg font-semibold">Wachtwoord wijzigen</h2>
  <form class="space-y-3" @submit.prevent="wijzigWachtwoord">
    <UFormField label="Huidig of tijdelijk wachtwoord" required><UInput v-model="pw.oud" type="password" size="xl" class="w-full" autocomplete="current-password" required /></UFormField>
    <UFormField label="Nieuw wachtwoord" hint="Minstens 8 tekens" required><UInput v-model="pw.nieuw" type="password" size="xl" class="w-full" autocomplete="new-password" minlength="8" required /></UFormField>
    <UButton type="submit" label="Wachtwoord wijzigen" size="xl" block />
  </form>
</template>
