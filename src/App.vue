<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

type Theme = 'blue' | 'graphite' | 'red'

declare global {
  interface Window {
    roxo: () => string
  }
}

const savedTheme = localStorage.getItem('tic:theme')
const availableThemes: Theme[] = ['blue', 'graphite', 'red']
const theme = ref<Theme>(availableThemes.includes(savedTheme as Theme) ? savedTheme as Theme : 'blue')

window.roxo = () => {
  theme.value = 'red'
  return 'caneta vermelha ativada ✎'
}

onBeforeUnmount(() => {
  delete (window as Partial<Window>).roxo
})

watch(theme, (value) => {
  document.documentElement.dataset.theme = value
  localStorage.setItem('tic:theme', value)
}, { immediate: true })
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/" aria-label="TIC, início">
        <span class="brand-mark"><i></i><i></i><i></i><i></i></span>
        <span>TIC</span>
      </RouterLink>
      <nav class="theme-switcher" aria-label="Tema da interface">
        <button :class="{ active: theme === 'blue' }" @click="theme = 'blue'">azul</button>
        <button :class="{ active: theme === 'graphite' }" @click="theme = 'graphite'">grafite</button>
        <button :class="{ active: theme === 'red' }" @click="theme = 'red'">vermelha</button>
      </nav>
    </header>
    <main><RouterView /></main>
  </div>
</template>
