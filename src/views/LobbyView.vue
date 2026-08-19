<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppNotice from '../components/AppNotice.vue'
import { createGame } from '../lib/api'
import { clearStoredUser, getStoredUser, storeGame } from '../lib/storage'

const router = useRouter()
const user = getStoredUser()
const code = ref('')
const loading = ref(false)
const error = ref('')

if (!user) router.replace('/')

async function newGame() {
  if (!user || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const game = await createGame(user.id)
    storeGame(game)
    await router.push(`/game/${game.id}`)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível criar a sala.'
  } finally { loading.value = false }
}

function enterGame() {
  const gameId = code.value.trim()
  if (gameId) router.push(`/game/${encodeURIComponent(gameId)}`)
}

function leave() {
  clearStoredUser()
  router.push('/')
}
</script>

<template>
  <section v-if="user" class="lobby page-narrow">
    <div class="welcome-row">
      <div>
        <p class="eyebrow">LOBBY</p>
        <h1>Olá, {{ user.name }}.</h1>
        <p>Chame alguém para uma partida ou entre em uma sala existente.</p>
      </div>
      <button class="text-button" @click="leave">Trocar jogador</button>
    </div>

    <AppNotice v-if="error" :message="error" kind="error" />
    <div class="lobby-options">
      <article class="panel lobby-card lobby-card--accent">
        <span class="option-icon">＋</span>
        <p class="eyebrow">NOVA PARTIDA</p>
        <h2>Crie sua sala</h2>
        <p>Você joga com X. Envie o link ou o código para seu adversário.</p>
        <button class="primary-button" :disabled="loading" @click="newGame">
          {{ loading ? 'Abrindo sala…' : 'Criar partida' }} <span>↗</span>
        </button>
      </article>

      <article class="panel lobby-card">
        <span class="option-icon option-icon--o">○</span>
        <p class="eyebrow">TENHO UM CONVITE</p>
        <h2>Entre com o código</h2>
        <p>Cole abaixo o identificador que você recebeu.</p>
        <form @submit.prevent="enterGame">
          <label for="game-code">Código da partida</label>
          <input id="game-code" v-model="code" placeholder="xxxxxxxx-xxxx-xxxx…" autocomplete="off" />
          <button class="secondary-button" :disabled="!code.trim()" type="submit">Entrar na sala <span>→</span></button>
        </form>
      </article>
    </div>
  </section>
</template>
