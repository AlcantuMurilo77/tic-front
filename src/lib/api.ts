import type { Game, RematchRequest, User } from '../types/game'

const API_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin)
).replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está ativo.')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    let message = body.trim()
    try {
      const payload = JSON.parse(body) as { error?: string; message?: string }
      message = payload.error || payload.message || message
    } catch {
      // The API is allowed to return plain text errors.
    }
    throw new Error(message || `O servidor respondeu com erro ${response.status}.`)
  }

  return response.json() as Promise<T>
}

export function createUser(input: Pick<User, 'name' | 'country' | 'xman'>): Promise<User> {
  return request('/users', { method: 'POST', body: JSON.stringify(input) })
}

export function createGame(userId: string): Promise<Game> {
  return request('/games', { method: 'POST', body: JSON.stringify({ user_x: userId }) })
}

export function joinGame(gameId: string, userId: string): Promise<Game> {
  return request(`/games/join?game_id=${encodeURIComponent(gameId)}`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

export function requestRematch(gameId: string, playerId: string): Promise<RematchRequest> {
  return request(`/games/rematch?game_id=${encodeURIComponent(gameId)}`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}

export function acceptRematch(rematchId: string, playerId: string): Promise<Game> {
  return request(`/games/rematch/accept?rematch_id=${encodeURIComponent(rematchId)}`, {
    method: 'POST',
    body: JSON.stringify({ player_id: playerId }),
  })
}
