<script setup lang="ts">
defineProps<{ message: string; kind?: 'error' | 'success' | 'info' }>()
</script>

<template>
  <div class="notice" :class="`notice--${kind || 'info'}`" role="status">
    <span>{{ kind === 'error' ? '!' : kind === 'success' ? '✓' : 'i' }}</span>
    <p>{{ message }}</p>
  </div>
</template>
