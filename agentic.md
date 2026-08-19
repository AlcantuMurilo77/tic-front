We are building a separate web frontend for an existing Go Tic-Tac-Toe backend. Use vue. Work like a senior front end engeneer.

BACKEND BASE URL
HTTP: http://localhost:8080
WebSocket: ws://localhost:8080/ws

CURRENT USER FLOW

1. Create user
POST /users

Body:
{
  "name": "Player X",
  "country": "BR",
  "xman": true
}

Response:
{
  "id": "uuid",
  "name": "Player X",
  "country": "BR",
  "xman": true
}

The frontend should persist the returned user id locally.

2. Create game
POST /games

Body:
{
  "user_x": "USER_ID"
}

Response contains:
{
  "id": "GAME_ID",
  "user_x": "USER_ID",
  "user_o": "00000000-0000-0000-0000-000000000000",
  "winner_id": "...",
  "started_at": "...",
  "ended_at": "...",
  "board": [[0,0,0],[0,0,0],[0,0,0]],
  "current_turn": "USER_ID",
  "status": "waiting"
}

The frontend should navigate to:
 /game/{GAME_ID}

and display an invite link:
 /game/{GAME_ID}

3. Join game from invite
POST /games/join?game_id=GAME_ID

Body:
{
  "user_id": "JOINING_USER_ID"
}

After join, response should contain:
{
  "user_x": "...",
  "user_o": "JOINING_USER_ID",
  "current_turn": "USER_X_ID",
  "status": "ready",
  "board": ...
}

4. WebSocket connection

Each player connects using:

ws://localhost:8080/ws?game_id=GAME_ID&player_id=PLAYER_ID

Player X and Player O each have independent WebSocket connections.

5. Make a move

Send through WebSocket:

{
  "game_id": "GAME_ID",
  "player_id": "PLAYER_ID",
  "row": 0,
  "col": 0
}

Backend validates:
- player belongs to game
- correct turn
- legal board position
- game rules

Board values:
0 = empty
1 = X
2 = O

6. State updates

After every valid move, backend broadcasts the full updated Game object to BOTH connected players.

The frontend should treat this server response as the authoritative game state and replace/update local game state from it.

If a move is invalid, the sender can receive:
{
  "error": "not your turn"
}

or another error message.

7. Victory

The backend game engine detects victory and returns winner_id in the Game response.
Frontend should show the end-game state when winner_id is non-zero.

ARCHITECTURE GOAL

Frontend should not implement Tic-Tac-Toe rules.
Backend is authoritative for:
- turns
- legal moves
- board
- victory
- player membership

Frontend responsibilities:
- user creation
- store player id
- create game
- invite UI
- join invite
- WebSocket lifecycle
- render board
- send moves
- render current turn
- render errors
- render winner

INITIAL FRONTEND PAGES

/
User setup / name entry

/lobby
Create Game

/game/[gameId]
Waiting room if status=waiting
Join flow for invited Player O
Board when status=ready

Use React/Next.js with TypeScript.
Keep HTTP API logic separated from WebSocket logic.
Suggested:
src/lib/api.ts
src/lib/websocket.ts
src/types/game.ts
src/components/GameBoard.tsx
