package game

import (
	"encoding/json"
	"log"
	"time"

	"github.com/datmedevil17/chesss/internal/services/engine"
)

type Bot struct {
	Client  *Client
	Engine  *engine.Engine
	History []string
}

func NewBot(room *GameRoom, enginePath string) *Bot {
	eng, err := engine.NewEngine(enginePath)
	if err != nil {
		log.Printf("Failed to start engine: %v", err)
		return nil
	}

	botClient := &Client{
		Send: make(chan []byte, 256),
		Role: "black",
	}

	bot := &Bot{
		Client:  botClient,
		Engine:  eng,
		History: make([]string, 0),
	}

	// Register bot to room
	room.Register <- botClient

	// Start bot loop
	go bot.Run(room)

	return bot
}

func (b *Bot) Run(room *GameRoom) {
	defer b.Engine.Close()

	for msg := range b.Client.Send {
		// Parse the broadcasted message
		var wsMsg WSMessage
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			log.Printf("Bot could not parse message: %v", err)
			continue
		}

		// Only respond to Moves and Init
		switch wsMsg.Type {
		case MsgInit:
			// Initialize bot with existing history if any
			if payloadMap, ok := wsMsg.Payload.(map[string]interface{}); ok {
				if history, ok := payloadMap["history"].([]interface{}); ok {
					for _, move := range history {
						if moveStr, ok := move.(string); ok {
							b.History = append(b.History, moveStr)
						}
					}
				}
			}
			log.Printf("Bot initialized with %d moves in history", len(b.History))

			// If it's bot's turn (odd history = white just moved), make a move
			if len(b.History)%2 != 0 {
				b.makeMove(room)
			}

		case MsgMove:
			// Handle move payload - could be string or MovePayload struct
			var moveStr string

			// Try to parse as MovePayload struct (map)
			if payloadMap, ok := wsMsg.Payload.(map[string]interface{}); ok {
				if move, ok := payloadMap["move"].(string); ok {
					moveStr = move
				}
			} else if str, ok := wsMsg.Payload.(string); ok {
				// Fallback: direct string payload
				moveStr = str
			}

			if moveStr == "" {
				log.Printf("Bot could not extract move from payload: %v", wsMsg.Payload)
				continue
			}

			// Check if this move is already in our history (our own move echoed back)
			if len(b.History) > 0 && b.History[len(b.History)-1] == moveStr {
				continue
			}

			// Append move to history
			b.History = append(b.History, moveStr)
			log.Printf("Bot received move: %s, history length: %d", moveStr, len(b.History))

			// Bot plays as Black (moves 2, 4, 6...)
			// If history length is odd, it means White just moved. Bot's turn.
			if len(b.History)%2 != 0 {
				b.makeMove(room)
			}
		}
	}
}

func (b *Bot) makeMove(room *GameRoom) {
	bestMove, err := b.Engine.GetBestMoveFromHistory(b.History, 10)
	if err != nil {
		log.Printf("Bot failed to find move: %v", err)
		return
	}

	// Add our move to history
	b.History = append(b.History, bestMove)
	log.Printf("Bot making move: %s", bestMove)

	// Update room state (clock, turn)
	elapsed := int(time.Since(room.LastMoveTime).Seconds())
	room.BlackTime -= elapsed
	if room.BlackTime < 0 {
		room.BlackTime = 0
	}
	room.LastMoveTime = time.Now()
	room.CurrentTurn = "white"
	room.MoveHistory = append(room.MoveHistory, bestMove)

	// Construct proper MovePayload response
	respMsg := WSMessage{
		Type: MsgMove,
		Payload: MovePayload{
			Move:        bestMove,
			WhiteTime:   room.WhiteTime,
			BlackTime:   room.BlackTime,
			LastMoveAt:  room.LastMoveTime.UnixMilli(),
			CurrentTurn: room.CurrentTurn,
		},
	}
	respBytes, _ := json.Marshal(respMsg)
	room.Broadcast <- respBytes
}
