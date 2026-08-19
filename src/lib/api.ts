import type { Game, User } from '../types/game'

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
    const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null
    throw new Error(payload?.error || payload?.message || `O servidor respondeu com erro ${response.status}.`)
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
