<script setup lang="ts">
const pb = usePb()
const fout = useFout()
const email = ref('')
const wachtwoord = ref('')
const bezig = ref(false)

async function inloggen() {
  bezig.value = true
  try {
    await pb.collection('users').authWithPassword(email.value.trim().toLowerCase(), wachtwoord.value)
    await navigateTo('/')
  } catch (e) { fout(e) } finally { bezig.value = false }
}
</script>

<template>
  <h1 class="mb-6 text-2xl font-bold">Inloggen</h1>
  <form class="space-y-4" @submit.prevent="inloggen">
    <UFormField label="E-mail" required><UInput v-model="email" type="email" size="xl" class="w-full" autocomplete="username" /></UFormField>
    <UFormField label="Wachtwoord" required><UInput v-model="wachtwoord" type="password" size="xl" class="w-full" autocomplete="current-password" /></UFormField>
    <UButton type="submit" label="Inloggen" size="xl" block :loading="bezig" />
  </form>
  <div class="mt-6 space-y-2 text-sm text-muted">
    <p>Nog geen account? Als de admin je e-mailadres heeft toegevoegd, kun je <NuxtLink to="/registreren" class="text-primary underline">zelf een account maken</NuxtLink>.</p>
    <p>Wachtwoord vergeten? Vraag de admin om een tijdelijk wachtwoord.</p>
  </div>
</template>
