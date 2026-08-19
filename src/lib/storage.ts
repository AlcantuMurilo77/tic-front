import type { User } from '../types/game'
import type { Game } from '../types/game'

const USER_KEY = 'tic:user'

export function getStoredUser(): User | null {
  try {
    const value = localStorage.getItem(USER_KEY)
    return value ? (JSON.parse(value) as User) : null
  } catch {
    return null
  }
}

export function storeUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_KEY)
}

export function storeGame(game: Game): void {
  localStorage.setItem(`tic:game:${game.id}`, JSON.stringify(game))
}

export function getStoredGame(gameId: string): Game | null {
  try {
    // Read the old session key as a migration path for already-open rooms.
    const key = `tic:game:${gameId}`
    const value = localStorage.getItem(key) || sessionStorage.getItem(key)
    return value ? (JSON.parse(value) as Game) : null
  } catch {
    return null
  }
}
