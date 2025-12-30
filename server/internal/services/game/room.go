package game

import "time"

type GameRoom struct {
	GameID       string
	Register     chan *Client
	Unregister   chan *Client
	Broadcast    chan []byte
	Clients      map[*Client]bool
	CurrentTurn  string   // "white" or "black"
	MoveHistory  []string // Track moves in memory (UCI format)
	WhiteTime    int      // Remaining time in seconds
	BlackTime    int
	LastMoveTime time.Time // When last move was made
}

func NewGameRoom(gameID string) *GameRoom {
	return &GameRoom{
		GameID:       gameID,
		Register:     make(chan *Client),
		Unregister:   make(chan *Client),
		Broadcast:    make(chan []byte),
		Clients:      make(map[*Client]bool),
		CurrentTurn:  "white",
		MoveHistory:  []string{},
		WhiteTime:    600, // Default 10 minutes
		BlackTime:    600,
		LastMoveTime: time.Now(),
	}
}

func (r *GameRoom) Run() {
	for {
		select {
		case c := <-r.Register:
			r.Clients[c] = true
		case c := <-r.Unregister:
			delete(r.Clients, c)
		case msg := <-r.Broadcast:
			for c := range r.Clients {
				c.Send <- msg
			}
		}
	}
}
