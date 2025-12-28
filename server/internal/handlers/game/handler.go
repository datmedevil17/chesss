package game

import (
	"net/http"

	"github.com/datmedevil17/chesss/internal/services/game"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Handler struct {
	hub *game.Hub
}

func NewHandler() *Handler {
	return &Handler{
		hub: game.NewHub(),
	}
}

func (h *Handler) WSHandler(c *gin.Context) {
	gameID := c.Param("gameId")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &game.Client{
		Conn: conn,
		Send: make(chan []byte),
	}

	room := h.hub.GetRoom(gameID)
	room.Register <- client

	// Check if user wants to play against AI (for testing/demo)
	if c.Query("bot") == "true" {
		// Attempt to start a bot. Assuming "stockfish" is in PATH.
		// In production, this logic belongs in Matchmaking/Hub startup.
		game.NewBot(room, "stockfish")
	}

	// Start reading from client (needed for processing pong/close frames)
	// For now, we just define a simple reader loop to keep connection alive
	go func() {
		defer func() {
			room.Unregister <- client
			conn.Close()
		}()
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}
			// Broadcast message to all clients in the room
			room.Broadcast <- msg
		}
	}()

	// Writing loop is handled by the Room broadcasting to Client.Send
	// We need a writer routine for the client
	go func() {
		defer conn.Close()
		for msg := range client.Send {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				break
			}
		}
	}()
}
