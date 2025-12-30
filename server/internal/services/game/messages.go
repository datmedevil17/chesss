package game

type MessageType string

const (
	MsgInit     MessageType = "init"
	MsgMove     MessageType = "move"
	MsgChat     MessageType = "chat"
	MsgError    MessageType = "error"
	MsgGameOver MessageType = "game_over"
)

type WSMessage struct {
	Type    MessageType `json:"type"`
	Payload interface{} `json:"payload"`
}

type InitPayload struct {
	FEN         string   `json:"fen"`
	History     []string `json:"history"`
	WhiteID     uint     `json:"white_id"`
	BlackID     uint     `json:"black_id"`
	WhiteName   string   `json:"white_name"` // Username of white player
	BlackName   string   `json:"black_name"` // Username of black player
	Status      string   `json:"status"`
	Color       string   `json:"color"`      // Color of the connected client ("white", "black", or "spectator")
	WhiteTime   int      `json:"white_time"` // Frozen time at last move (seconds)
	BlackTime   int      `json:"black_time"`
	LastMoveAt  int64    `json:"last_move_at"` // Unix timestamp (ms) when last move was made
	CurrentTurn string   `json:"current_turn"` // "white" or "black"
}

type ChatPayload struct {
	Sender    string `json:"sender"`
	Text      string `json:"text"`
	Timestamp string `json:"timestamp"` // ISO string
}

type GameOverPayload struct {
	Result string `json:"result"` // "1-0", "0-1", "1/2-1/2"
	Reason string `json:"reason"` // "checkmate", "stalemate", "draw", "timeout", "resign"
	Winner string `json:"winner"` // "white", "black", "" (for draw)
}

type MovePayload struct {
	Move        string `json:"move"`       // UCI move string
	WhiteTime   int    `json:"white_time"` // Frozen time at this move (seconds)
	BlackTime   int    `json:"black_time"`
	LastMoveAt  int64  `json:"last_move_at"` // Unix timestamp (ms) when this move was made
	CurrentTurn string `json:"current_turn"` // Whose turn it is now
}
