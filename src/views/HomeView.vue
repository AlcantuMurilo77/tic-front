<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppNotice from '../components/AppNotice.vue'
import { createUser } from '../lib/api'
import { getStoredUser, storeUser } from '../lib/storage'

const router = useRouter()
const name = ref('')
const country = ref('BR')
const loading = ref(false)
const error = ref('')
const existingUser = ref(getStoredUser())
const valid = computed(() => name.value.trim().length >= 2 && country.value.trim().length === 2)

onMounted(() => { if (existingUser.value) name.value = existingUser.value.name })

async function submit() {
  if (!valid.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const user = await createUser({ name: name.value.trim(), country: country.value.trim().toUpperCase(), xman: true })
    storeUser(user)
    await router.push('/lobby')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Não foi possível criar seu jogador.'
  } finally {
    loading.value = false
  }
}

function continueSession() { router.push('/lobby') }
</script>

<template>
  <section class="hero page-grid">
    <div class="hero-copy">
      <p class="eyebrow">TIC-TAC-TOE</p>
      <h1>Jogo da<br><em>velha.</em></h1>
      <p class="hero-subtitle">Crie uma sala, envie o link e jogue.</p>
      <div class="mini-board" aria-hidden="true">
        <span>×</span><span></span><span>○</span><span></span><span>×</span><span></span><span>○</span><span></span><span>×</span>
      </div>
    </div>

    <div class="panel setup-card">
      <div class="panel-number">01</div>
      <p class="eyebrow">PREPARE-SE</p>
      <h2>Quem vai jogar?</h2>
      <p>Seu nome aparecerá para o outro jogador durante a partida.</p>

      <AppNotice v-if="error" :message="error" kind="error" />
      <AppNotice v-if="existingUser" :message="`Você já está conectado como ${existingUser.name}.`" />

      <form @submit.prevent="submit">
        <label for="player-name">Seu nome</label>
        <input id="player-name" v-model="name" maxlength="32" autocomplete="name" placeholder="Ex.: Marina" autofocus />
        <label for="country">País</label>
        <input id="country" v-model="country" maxlength="2" aria-describedby="country-help" />
        <small id="country-help">Código de duas letras, como BR ou PT.</small>
        <button class="primary-button" :disabled="!valid || loading" type="submit">
          {{ loading ? 'Criando jogador…' : 'Começar a jogar' }} <span>↗</span>
        </button>
        <button v-if="existingUser" class="text-button" type="button" @click="continueSession">
          Continuar como {{ existingUser.name }}
        </button>
      </form>
    </div>
  </section>
</template>
