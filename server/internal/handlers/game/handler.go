package game

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/datmedevil17/chesss/internal/database"
	"github.com/datmedevil17/chesss/internal/models"
	"github.com/datmedevil17/chesss/internal/services/game"
	"github.com/datmedevil17/chesss/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Handler struct {
	hub       *game.Hub
	jwtSecret string
}

func NewHandler(jwtSecret string) *Handler {
	return &Handler{
		hub:       game.NewHub(),
		jwtSecret: jwtSecret,
	}
}

func (h *Handler) WSHandler(c *gin.Context) {
	gameID := c.Param("gameId")
	tokenString := c.Query("token")

	// 1. Validate Token
	var userID uint
	if tokenString != "" {
		claims, err := utils.ValidateToken(tokenString, h.jwtSecret)
		if err == nil {
			userID = claims.UserID
		} else {
			log.Printf("Invalid token: %v", err)
		}
	}

	// 2. Fetch Game to determine Role
	var role = "spectator"
	var gameModel models.Game
	if err := database.GetDB().Where("id = ?", gameID).First(&gameModel).Error; err != nil {
		log.Printf("Game not found: %v", err)
		// We might still allow connection as spectator or just return?
		// For now, let's proceed but role will certainly be spectator if game not found (or error)
	} else {
		if userID == gameModel.WhiteID {
			role = "white"
		} else if userID == gameModel.BlackID {
			role = "black"
		}
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &game.Client{
		Conn:   conn,
		Send:   make(chan []byte, 256), // Buffered to avoid deadlock
		UserID: userID,
		Role:   role,
	}

	log.Printf("New Client Connected: UserID=%d, Role=%s, GameID=%s", userID, role, gameID)

	room := h.hub.GetRoom(gameID)
	room.Register <- client

	// Check if user wants to play against AI (for testing/demo)
	if c.Query("bot") == "true" {
		// Attempt to start a bot. Assuming "stockfish" is in PATH.
		// In production, this logic belongs in Matchmaking/Hub startup.
		game.NewBot(room, "stockfish")
	}

	// Send Init JSON
	fen := gameModel.FEN
	if fen == "" || fen == "startpos" {
		fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
	}
	initMsg := game.WSMessage{
		Type: game.MsgInit,
		Payload: game.InitPayload{
			FEN:     fen,
			WhiteID: gameModel.WhiteID,
			BlackID: gameModel.BlackID,
			Status:  gameModel.Status,
			Color:   role,
			// History: []string{}, // TODO: Populate from DB
		},
	}
	initBytes, _ := json.Marshal(initMsg)
	client.Send <- initBytes

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.WritePump()
	go client.ReadPump(room)
}
