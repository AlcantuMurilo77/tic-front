import type { Game, Move, RematchRequest, WebSocketEvent } from '../types/game'

const configuredWsUrl = import.meta.env.VITE_WS_URL || (
  import.meta.env.DEV
    ? 'ws://localhost:8080/ws'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
)

const wsUrl = new URL(configuredWsUrl, window.location.origin)
if (window.location.protocol === 'https:' && wsUrl.protocol === 'ws:') {
  wsUrl.protocol = 'wss:'
}
const WS_URL = wsUrl.toString()

interface GameSocketHandlers {
  onGame: (game: Game) => void
  onRematchRequested: (rematch: RematchRequest) => void
  onRematchAccepted: (game: Game) => void
  onError: (message: string) => void
  onStatus: (connected: boolean) => void
}

type SocketRecord = Record<string, unknown>

function isRecord(value: unknown): value is SocketRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGame(value: unknown): value is Game {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.status === 'string' &&
    (Array.isArray(value.board) || typeof value.user_x === 'string')
}

function isCompleteGame(value: unknown): value is Game {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.user_x === 'string' &&
    typeof value.user_o === 'string' &&
    typeof value.winner_id === 'string' &&
    typeof value.started_at === 'string' &&
    typeof value.ended_at === 'string' &&
    Array.isArray(value.board) &&
    typeof value.current_turn === 'string' &&
    typeof value.status === 'string'
}

function isRematchRequest(value: unknown): value is RematchRequest {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.original_game_id === 'string' &&
    typeof value.requested_by_player_id === 'string' &&
    (value.status === 'pending' || value.status === 'accepted') &&
    typeof value.created_at === 'string'
}

function findRematchEvent(value: unknown): WebSocketEvent | null {
  if (!isRecord(value)) return null
  if (value.type === 'rematch_requested' && isRematchRequest(value.payload)) {
    return { type: value.type, payload: value.payload }
  }
  if (value.type === 'rematch_accepted' && isCompleteGame(value.payload)) {
    return { type: value.type, payload: value.payload }
  }
  return null
}

function findGame(value: unknown): Game | null {
  if (!isRecord(value)) return null

  // A game can arrive directly or wrapped by the websocket protocol.
  if (isGame(value)) {
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

        const rematchEvent = findRematchEvent(data)
        if (rematchEvent?.type === 'rematch_requested') {
          this.handlers.onRematchRequested(rematchEvent.payload)
          return
        }
        if (rematchEvent?.type === 'rematch_accepted') {
          this.handlers.onRematchAccepted(rematchEvent.payload)
          return
        }

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
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
    const previous = this.socket
    this.socket = null
    if (previous) {
      previous.onopen = null
      previous.onmessage = null
      previous.onerror = null
      previous.onclose = null
      previous.close()
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.retries++, 8000)
    this.retryTimer = window.setTimeout(() => this.connect(), delay)
  }
}
