<script setup lang="ts">
import type { Board } from '../types/game'

defineProps<{
  board: Board
  disabled: boolean
  winningCells?: string[]
}>()

const emit = defineEmits<{ move: [row: number, col: number] }>()
</script>

<template>
  <div class="board" :class="{ 'board--disabled': disabled }" role="grid" aria-label="Tabuleiro do jogo">
    <template v-for="(row, rowIndex) in board" :key="rowIndex">
      <button
        v-for="(cell, colIndex) in row"
        :key="`${rowIndex}-${colIndex}`"
        class="cell"
        :class="[
          cell === 1 ? 'cell--x' : cell === 2 ? 'cell--o' : '',
          winningCells?.includes(`${rowIndex}-${colIndex}`) ? 'cell--winner' : '',
        ]"
        :disabled="disabled || cell !== 0"
        :aria-label="cell === 0 ? `Linha ${rowIndex + 1}, coluna ${colIndex + 1}, vazia` : cell === 1 ? 'X' : 'O'"
        role="gridcell"
        @click="emit('move', rowIndex, colIndex)"
      >
        <span v-if="cell === 1" aria-hidden="true">×</span>
        <span v-else-if="cell === 2" aria-hidden="true">○</span>
      </button>
    </template>
  </div>
</template>
