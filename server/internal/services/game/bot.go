package game

import (
	"encoding/json"
	"log"

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
		Send: make(chan []byte),
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
		// Client now broadcasts raw JSON bytes. We need to unmarshal to find the move string?
		// Actually, Bot is a Client. It receives what is broadcasted to the room.
		// If Client sends JSON, Bot receives JSON bytes.
		// We need to parse it.

		var wsMsg WSMessage
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			log.Printf("Bot could not parse message: %v", err)
			continue
		}

		// Only respond to Moves
		if wsMsg.Type != MsgMove {
			continue
		}

		moveStr, ok := wsMsg.Payload.(string)
		if !ok {
			continue
		}

		// Append move to history (which we maintain in Bot struct)
		b.History = append(b.History, moveStr)

		// Bot plays as Black (moves 2, 4, 6...)
		// If history length is odd, it means White just moved. Bot's turn.
		if len(b.History)%2 != 0 {
			bestMove, err := b.Engine.GetBestMoveFromHistory(b.History, 1000)
			if err == nil {
				// Construct JSON Move
				respMsg := WSMessage{
					Type:    MsgMove,
					Payload: bestMove,
				}
				respBytes, _ := json.Marshal(respMsg)
				room.Broadcast <- respBytes
			} else {
				log.Printf("Bot failed to find move: %v", err)
			}
		}
	}
}
