<script setup lang="ts">
const pb = usePb()
const fout = useFout()
const form = reactive({ clubnaam: '', naam: '', email: '', wachtwoord: '' })
const bezig = ref(false)

async function inrichten() {
  bezig.value = true
  try {
    await $fetch('/api/setup', { baseURL: pb.baseURL, method: 'POST', body: form })
    useState('ingericht').value = true
    await pb.collection('users').authWithPassword(form.email, form.wachtwoord)
    await navigateTo('/')
  } catch (e: any) {
    fout({ message: e?.data?.message || e.message })
  } finally { bezig.value = false }
}
</script>

<template>
  <h1 class="mb-1 text-2xl font-bold">Welkom</h1>
  <p class="mb-6 text-muted">Richt de app in: vul de clubnaam en het eerste admin-account in.</p>
  <form class="space-y-4" @submit.prevent="inrichten">
    <UFormField label="Clubnaam" required><UInput v-model="form.clubnaam" size="xl" class="w-full" /></UFormField>
    <UFormField label="Jouw naam" required><UInput v-model="form.naam" size="xl" class="w-full" autocomplete="name" /></UFormField>
    <UFormField label="E-mail" required><UInput v-model="form.email" type="email" size="xl" class="w-full" autocomplete="email" /></UFormField>
    <UFormField label="Wachtwoord" hint="Minstens 10 tekens" required>
      <UInput v-model="form.wachtwoord" type="password" size="xl" class="w-full" autocomplete="new-password" minlength="10" />
    </UFormField>
    <UButton type="submit" label="App inrichten" size="xl" block :loading="bezig" />
  </form>
</template>
