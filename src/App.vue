<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

type Theme = 'dark' | 'terminal' | 'light'

const savedTheme = localStorage.getItem('tic:theme')
const theme = ref<Theme>(savedTheme === 'terminal' || savedTheme === 'light' ? savedTheme : 'dark')

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
        <button :class="{ active: theme === 'dark' }" @click="theme = 'dark'">escuro</button>
        <button :class="{ active: theme === 'terminal' }" @click="theme = 'terminal'">terminal</button>
        <button :class="{ active: theme === 'light' }" @click="theme = 'light'">claro <span>(para psicopatas)</span></button>
      </nav>
    </header>
    <main><RouterView /></main>
    <footer>tic-tac-toe</footer>
  </div>
</template>
