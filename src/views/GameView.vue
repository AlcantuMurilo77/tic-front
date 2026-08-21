<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNotice from '../components/AppNotice.vue'
import GameBoard from '../components/GameBoard.vue'
import PlayerCard from '../components/PlayerCard.vue'
import { joinGame } from '../lib/api'
import { GameSocket } from '../lib/websocket'
import { getStoredGame, getStoredUser, storeGame } from '../lib/storage'
import type { Board, Game } from '../types/game'
import { ZERO_UUID } from '../types/game'

const route = useRoute()
const router = useRouter()
const gameId = String(route.params.gameId)
const user = getStoredUser()
const game = ref<Game | null>(getStoredGame(gameId))
const socketConnected = ref(false)
const joining = ref(false)
const movePending = ref(false)
const error = ref('')
const copied = ref(false)
let socket: GameSocket | null = null
let wasPageHidden = document.visibilityState === 'hidden'
let lastResumeAt = 0

const emptyBoard: Board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
const isParticipant = computed(() => !!user && !!game.value && [game.value.user_x, game.value.user_o].includes(user.id))
const isWaiting = computed(() => !game.value || game.value.status === 'waiting' || game.value.user_o === ZERO_UUID)
const isEnded = computed(() => game.value?.status === 'finished')
const isDraw = computed(() => isEnded.value && game.value?.winner_id === ZERO_UUID)
const hasWinner = computed(() => isEnded.value && !!game.value?.winner_id && game.value.winner_id !== ZERO_UUID)
const isMyTurn = computed(() => !!user && game.value?.current_turn === user.id)
const myMark = computed(() => game.value?.user_x === user?.id ? 'X' : 'O')
const xName = computed(() => game.value?.player_x?.name || game.value?.user_x_name || (game.value?.user_x === user?.id ? user?.name : '') || 'Jogador X')
const oName = computed(() => game.value?.player_o?.name || game.value?.user_o_name || (game.value?.user_o === user?.id ? user?.name : '') || 'Jogador O')
const winnerName = computed(() => game.value?.winner_id === game.value?.user_x ? xName.value : oName.value)
const didIWin = computed(() => game.value?.winner_id === user?.id)
const inviteUrl = computed(() => `${window.location.origin}/game/${gameId}`)
const statusText = computed(() => {
  if (!socketConnected.value) return 'Conectando…'
  if (isDraw.value) return 'Empate'
  if (hasWinner.value) return 'Partida encerrada'
  return isMyTurn.value ? 'Sua vez de jogar' : `Vez de ${game.value?.current_turn === game.value?.user_x ? xName.value : oName.value}`
})

onMounted(() => {
  if (!user) {
    router.replace({ path: '/', query: { redirect: route.fullPath } })
    return
  }

  // Keep the creator connected as soon as the room exists, including after F5.
  if (game.value && isParticipant.value) connect()

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pageshow', handlePageShow)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pageshow', handlePageShow)
  socket?.close()
})

function resumeConnection() {
  if (!user || !game.value || !isParticipant.value) return
  const now = Date.now()
  if (now - lastResumeAt < 500) return
  lastResumeAt = now

  if (socket) socket.reconnect()
  else connect()
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    wasPageHidden = true
    return
  }

  if (wasPageHidden) {
    wasPageHidden = false
    resumeConnection()
  }
}

function handlePageShow(event: PageTransitionEvent) {
  // iOS can restore the page from its back-forward cache without creating a
  // new component, leaving the previous WebSocket stale.
  if (event.persisted) resumeConnection()
}

function connect() {
  if (!user || socket) return
  socket = new GameSocket(gameId, user.id, {
    onGame: (updated) => {
      // Some websocket implementations send a compact game update. Preserve
      // fields from the create/join response while applying the server update.
      const nextGame = game.value ? { ...game.value, ...updated } : updated
      game.value = nextGame
      storeGame(nextGame)
      movePending.value = false
      error.value = ''
    },
    onError: (message) => {
      error.value = message
      movePending.value = false
    },
    onStatus: (connected) => { socketConnected.value = connected },
  })
  socket.connect()
}

async function join() {
  if (!user || joining.value) return
  joining.value = true
  error.value = ''
  try {
    const joined = await joinGame(gameId, user.id)
    game.value = joined
    storeGame(joined)
    connect()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível entrar nesta partida.'
  } finally { joining.value = false }
}

function play(row: number, col: number) {
  if (!user || !game.value || !isMyTurn.value || movePending.value || isEnded.value) return
  error.value = ''
  if (socket?.sendMove({ game_id: gameId, player_id: user.id, row, col })) movePending.value = true
}

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteUrl.value)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 2000)
  } catch { error.value = 'Não foi possível copiar. Selecione o link manualmente.' }
}

function goLobby() {
  socket?.close()
  router.push('/lobby')
}
</script>

<template>
  <section v-if="user" class="game-page page-narrow">
    <div class="game-topbar">
      <button class="back-button" @click="goLobby">← <span>Lobby</span></button>
      <div class="room-code"><small>SALA</small><strong>{{ gameId.slice(0, 8) }}</strong></div>
      <span class="connection" :class="{ online: socketConnected }"><i></i>{{ socketConnected ? 'ao vivo' : 'offline' }}</span>
    </div>

    <AppNotice v-if="error" :message="error" kind="error" />

    <div v-if="isWaiting" class="waiting-layout">
      <div class="waiting-art" aria-hidden="true">
        <div class="radar"><span>×</span><i></i><i></i><i></i></div>
      </div>

      <article v-if="game && game.user_x === user.id" class="panel waiting-card">
        <p class="eyebrow">SALA CRIADA</p>
        <h1>Esperando<br>seu adversário<span>…</span></h1>
        <p>A partida começa assim que alguém entrar pelo convite.</p>
        <label for="invite-link">Link do convite</label>
        <div class="copy-field">
          <input id="invite-link" :value="inviteUrl" readonly @focus="($event.target as HTMLInputElement).select()" />
          <button @click="copyInvite">{{ copied ? 'Copiado ✓' : 'Copiar' }}</button>
        </div>
        <div class="code-display"><small>OU ENVIE O CÓDIGO</small><strong>{{ gameId }}</strong></div>
      </article>

      <article v-else class="panel waiting-card join-card">
        <p class="eyebrow">VOCÊ FOI CONVIDADO</p>
        <h1>Uma partida<br>te espera.</h1>
        <p>Você entrará como <strong>O</strong> e o jogador que criou a sala começa.</p>
        <div class="invite-summary"><span>○</span><div><small>JOGANDO COMO</small><strong>{{ user.name }}</strong></div></div>
        <button class="primary-button" :disabled="joining" @click="join">
          {{ joining ? 'Entrando…' : 'Entrar na partida' }} <span>→</span>
        </button>
      </article>
    </div>

    <div v-else-if="game" class="match-layout">
      <div class="match-heading">
        <p class="eyebrow">PARTIDA EM ANDAMENTO</p>
        <h1>{{ statusText }}</h1>
        <p v-if="movePending">Aguardando confirmação do servidor…</p>
        <p v-else-if="!isEnded">Você joga com <strong>{{ myMark }}</strong></p>
      </div>

      <div class="players-row">
        <PlayerCard :name="xName" mark="X" :you="game.user_x === user.id" :active="!isEnded && game.current_turn === game.user_x" :winner="game.winner_id === game.user_x" />
        <span class="versus">VS</span>
        <PlayerCard :name="oName" mark="O" :you="game.user_o === user.id" :active="!isEnded && game.current_turn === game.user_o" :winner="game.winner_id === game.user_o" />
      </div>

      <GameBoard :board="game.board || emptyBoard" :disabled="!isMyTurn || movePending || isEnded || !socketConnected" @move="play" />
      <p class="board-hint">{{ isEnded ? 'A partida terminou.' : isMyTurn ? 'Escolha uma casa vazia.' : 'Aguarde a jogada do adversário.' }}</p>
    </div>

    <div v-if="game && isEnded" class="result-overlay">
      <article class="result-modal">
        <button class="result-close" aria-label="Fechar resultado" @click="goLobby">×</button>
        <div class="result-symbol" :class="{ loss: hasWinner && !didIWin }">{{ isDraw ? '＝' : didIWin ? '✦' : '×' }}</div>
        <p class="eyebrow">PARTIDA ENCERRADA</p>
        <h2 v-if="isDraw">Deu velha!</h2>
        <h2 v-else-if="didIWin">Você venceu!</h2>
        <h2 v-else>Vitória de {{ winnerName }}</h2>
        <p v-if="hasWinner">{{ winnerName }} completou a partida como campeão.</p>
        <p v-else>Ninguém levou essa. Uma revanche resolve?</p>
        <div class="result-players">
          <span :class="{ champion: game.winner_id === game.user_x }">× {{ xName }}</span>
          <span :class="{ champion: game.winner_id === game.user_o }">○ {{ oName }}</span>
        </div>
        <button class="primary-button" @click="goLobby">Voltar ao lobby <span>→</span></button>
      </article>
    </div>
  </section>
</template>
