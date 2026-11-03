<script setup lang="ts">
const pb = usePb()
const fout = useFout()
const form = reactive({ name: '', email: '', password: '' })
const bezig = ref(false)

async function registreer() {
  bezig.value = true
  try {
    const email = form.email.trim().toLowerCase()
    await pb.collection('users').create({ name: form.name.trim(), email, password: form.password, passwordConfirm: form.password })
    await pb.collection('users').authWithPassword(email, form.password)
    await navigateTo('/')
  } catch (e) { fout(e) } finally { bezig.value = false }
}
</script>

<template>
  <h1 class="mb-1 text-2xl font-bold">Account maken</h1>
  <p class="mb-6 text-muted">Dit kan alleen met een e-mailadres dat de admin heeft toegevoegd.</p>
  <form class="space-y-4" @submit.prevent="registreer">
    <UFormField label="Naam" required><UInput v-model="form.name" size="xl" class="w-full" autocomplete="name" required /></UFormField>
    <UFormField label="E-mail" required><UInput v-model="form.email" type="email" size="xl" class="w-full" autocomplete="email" required /></UFormField>
    <UFormField label="Wachtwoord" hint="Minstens 8 tekens" required>
      <UInput v-model="form.password" type="password" size="xl" class="w-full" autocomplete="new-password" minlength="8" required />
    </UFormField>
    <UButton type="submit" label="Account maken" size="xl" block :loading="bezig" />
    <UButton to="/login" label="Ik heb al een account" variant="link" block />
  </form>
</template>
