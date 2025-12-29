package game

type GameRoom struct {
	GameID      string
	Register    chan *Client
	Unregister  chan *Client
	Broadcast   chan []byte
	Clients     map[*Client]bool
	CurrentTurn string // "white" or "black"
}

func NewGameRoom(gameID string) *GameRoom {
	return &GameRoom{
		GameID:      gameID,
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		Broadcast:   make(chan []byte),
		Clients:     make(map[*Client]bool),
		CurrentTurn: "white", // Always starts with white
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
