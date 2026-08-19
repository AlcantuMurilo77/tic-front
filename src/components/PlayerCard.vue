<script setup lang="ts">
defineProps<{
  name: string
  mark: 'X' | 'O'
  active?: boolean
  winner?: boolean
  you?: boolean
}>()
</script>

<template>
  <article class="player-card" :class="[{ active, winner }, `player-card--${mark.toLowerCase()}`]">
    <span class="player-mark">{{ mark === 'X' ? '×' : '○' }}</span>
    <div>
      <small>{{ you ? 'você' : 'adversário' }}</small>
      <strong>{{ name }}</strong>
    </div>
    <span v-if="winner" class="winner-pill">venceu</span>
    <span v-else-if="active" class="turn-pulse" title="Jogando agora"></span>
  </article>
</template>
