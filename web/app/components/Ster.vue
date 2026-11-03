<!-- Eén ster: gevuld of alleen omlijnd, zodat de score ook zonder kleur leesbaar is. -->
<script setup lang="ts">
defineProps<{ vol: boolean }>()
</script>

<template>
  <svg viewBox="0 0 24 24" aria-hidden="true" class="size-full" :fill="vol ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
    <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z" />
  </svg>
</template>
