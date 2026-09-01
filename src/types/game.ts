export type Mark = 0 | 1 | 2
export type Board = [[Mark, Mark, Mark], [Mark, Mark, Mark], [Mark, Mark, Mark]]

export interface User {
  id: string
  name: string
  country: string
  xman: boolean
}

export interface Game {
  id: string
  user_x: string
  user_o: string
  winner_id: string
  started_at: string
  ended_at: string
  board: Board
  current_turn: string
  status: string
  user_x_name?: string
  user_o_name?: string
  player_x?: User
  player_o?: User
  rematch_of_game_id?: string
}

export interface RematchRequest {
  id: string
  original_game_id: string
  requested_by_player_id: string
  status: 'pending' | 'accepted'
  accepted_by_player_id?: string
  new_game_id?: string
  created_at: string
  accepted_at?: string
}

export interface RematchRequestedEvent {
  type: 'rematch_requested'
  payload: RematchRequest
}

export interface RematchAcceptedEvent {
  type: 'rematch_accepted'
  payload: Game
}

export type WebSocketEvent = RematchRequestedEvent | RematchAcceptedEvent

export interface Move {
  game_id: string
  player_id: string
  row: number
  col: number
}

export const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
