import type { Game, Move } from '../types/game'

const WS_URL = import.meta.env.VITE_WS_URL || (
  import.meta.env.DEV
    ? 'ws://localhost:8080/ws'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
)

interface GameSocketHandlers {
  onGame: (game: Game) => void
  onError: (message: string) => void
  onStatus: (connected: boolean) => void
}

type SocketRecord = Record<string, unknown>

function isRecord(value: unknown): value is SocketRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function findGame(value: unknown): Game | null {
  if (!isRecord(value)) return null

  // A game can arrive directly or wrapped by the websocket protocol.
  if (
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    (Array.isArray(value.board) || typeof value.user_x === 'string')
  ) {
    return { ...value, status: value.status.toLowerCase() } as unknown as Game
  }

  for (const key of ['game', 'data', 'payload']) {
    const game = findGame(value[key])
    if (game) return game
  }
  return null
}

function findError(value: unknown): string | null {
  if (!isRecord(value)) return null
  if (typeof value.error === 'string') return value.error
  if (typeof value.message === 'string' && !findGame(value)) return value.message
  return null
}

export class GameSocket {
  private socket: WebSocket | null = null
  private retryTimer: number | null = null
  private retries = 0
  private closedByClient = false

  constructor(
    private readonly gameId: string,
    private readonly playerId: string,
    private readonly handlers: GameSocketHandlers,
  ) {}

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING) return
    this.closedByClient = false
    const url = new URL(WS_URL)
    url.searchParams.set('game_id', this.gameId)
    url.searchParams.set('player_id', this.playerId)
    this.socket = new WebSocket(url)

    this.socket.onopen = () => {
      this.retries = 0
      this.handlers.onStatus(true)
    }
    this.socket.onmessage = (event) => {
      try {
        console.info('[tic/ws] mensagem bruta do backend:', event.data)
        const data: unknown = JSON.parse(event.data)
        console.info('[tic/ws] mensagem interpretada:', data)

        const error = findError(data)
        if (error) {
          this.handlers.onError(error)
          return
        }

        const game = findGame(data)
        if (game) {
          console.info('[tic/ws] game recebido:', {
            id: game.id,
            status: game.status,
            user_x: game.user_x,
            user_o: game.user_o,
          })
          this.handlers.onGame(game)
          return
        }

        console.warn('[tic/ws] resposta não reconhecida:', data)
        this.handlers.onError('O servidor enviou uma atualização sem os dados da partida.')
      } catch {
        this.handlers.onError('O servidor enviou uma atualização inválida.')
      }
    }
    this.socket.onerror = () => this.handlers.onError('A conexão em tempo real encontrou um erro.')
    this.socket.onclose = () => {
      this.handlers.onStatus(false)
      if (!this.closedByClient) this.scheduleReconnect()
    }
  }

  reconnect(): void {
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer)
      this.retryTimer = null
    }

    const previous = this.socket
    this.socket = null
    if (previous) {
      // This is a deliberate refresh, so the old close handler must not create
      // a second retry alongside the new connection.
      previous.onclose = null
      previous.onerror = null
      previous.close()
    }
    this.connect()
  }

  sendMove(move: Move): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.handlers.onError('Reconectando ao jogo. Tente novamente em instantes.')
      return false
    }
    this.socket.send(JSON.stringify(move))
    return true
  }

  close(): void {
    this.closedByClient = true
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer)
    this.socket?.close()
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.retries++, 8000)
    this.retryTimer = window.setTimeout(() => this.connect(), delay)
  }
}
