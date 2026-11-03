<script setup lang="ts">
const pb = usePb()
const fout = useFout()
const toast = useToast()
const email = ref('')
const wachtwoord = ref('')
const bezig = ref(false)

async function inloggen() {
  bezig.value = true
  try {
    await pb.collection('users').authWithPassword(email.value, wachtwoord.value)
    await navigateTo('/')
  } catch (e) { fout(e) } finally { bezig.value = false }
}

async function vergeten() {
  if (!email.value) return toast.add({ title: 'Vul eerst je e-mailadres in', color: 'warning' })
  await pb.collection('users').requestPasswordReset(email.value).catch(fout)
  toast.add({ title: 'Als dit adres bekend is, is er een e-mail verstuurd', color: 'success' })
}
</script>

<template>
  <h1 class="mb-6 text-2xl font-bold">Inloggen</h1>
  <form class="space-y-4" @submit.prevent="inloggen">
    <UFormField label="E-mail" required><UInput v-model="email" type="email" size="xl" class="w-full" autocomplete="username" /></UFormField>
    <UFormField label="Wachtwoord" required><UInput v-model="wachtwoord" type="password" size="xl" class="w-full" autocomplete="current-password" /></UFormField>
    <UButton type="submit" label="Inloggen" size="xl" block :loading="bezig" />
    <UButton label="Wachtwoord vergeten of uitnodiging kwijt?" variant="link" block @click="vergeten" />
  </form>
</template>
