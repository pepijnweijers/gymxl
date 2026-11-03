<!-- Score als sterren (alleen tonen), met de score als tekst voor schermlezers. -->
<script setup lang="ts">
defineProps<{ score: number }>()
</script>

<template>
  <span class="inline-flex items-center gap-0.5 text-primary" :title="sterrenTekst(score)">
    <span v-for="n in MAX_STERREN" :key="n" class="size-4"><Ster :vol="n <= score" /></span>
    <span class="sr-only">{{ sterrenTekst(score) }}</span>
  </span>
</template>
