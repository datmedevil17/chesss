package game

import "sync"

type Hub struct {
	games map[string]*GameRoom
	mu    sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		games: make(map[string]*GameRoom),
	}
}

func (h *Hub) GetRoom(gameID string) *GameRoom {
	h.mu.Lock()
	defer h.mu.Unlock()

	if room, ok := h.games[gameID]; ok {
		return room
	}

	room := NewGameRoom(gameID)
	h.games[gameID] = room
	go room.Run()
	return room
}
