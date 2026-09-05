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
    <svg class="board-lines" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M99 3 C102 72 96 127 101 197 C103 238 99 268 100 297" />
      <path d="M102 3 C99 72 104 131 100 198 C98 236 103 270 101 297" />
      <path d="M199 3 C196 66 203 133 198 198 C196 239 201 268 200 297" />
      <path d="M202 3 C199 67 205 132 201 199 C199 239 203 270 201 297" />
      <path d="M3 99 C69 96 132 103 199 98 C237 96 270 101 297 100" />
      <path d="M3 102 C68 100 132 105 199 101 C238 99 269 103 297 101" />
      <path d="M3 199 C69 202 129 196 199 201 C238 203 269 198 297 200" />
      <path d="M3 202 C68 204 131 199 199 203 C238 205 270 200 297 202" />
    </svg>
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
        <svg v-if="cell === 1" class="board-mark" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M20 19 C36 37 59 57 80 81 M23 18 C40 39 61 59 78 83 M80 19 C62 35 43 59 19 80 M82 22 C61 39 44 61 22 82" />
        </svg>
        <svg v-else-if="cell === 2" class="board-mark" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M72 25 C88 39 82 68 66 79 C48 91 24 77 19 58 C14 39 28 21 47 18 C57 17 67 20 72 25 Z M70 27 C83 41 79 66 64 76 C48 85 27 75 22 57 C18 41 30 24 47 21 C57 20 66 22 70 27 Z" />
        </svg>
      </button>
    </template>
  </div>
</template>
