package game

import (
	"log"

	"github.com/datmedevil17/chesss/internal/services/engine"
)

type Bot struct {
	Client *Client
	Engine *engine.Engine
}

func NewBot(room *GameRoom, enginePath string) *Bot {
	eng, err := engine.NewEngine(enginePath)
	if err != nil {
		log.Printf("Failed to start engine: %v", err)
		return nil
	}

	botClient := &Client{
		Send: make(chan []byte),
	}

	bot := &Bot{
		Client: botClient,
		Engine: eng,
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
		// msg is expected to be the FEN string or a JSON with FEN
		// For simplicity, let's assume raw FEN for now (or basic move notation)
		// Only move if it's bot's turn.
		// TODO: Parse FEN to check turn. check if it's black or white.

		// For now, we blindly reply with a best move if message looks like a FEN
		fen := string(msg)
		if len(fen) > 10 { // Basic sanity check
			bestMove, err := b.Engine.GetBestMove(fen, 10)
			if err == nil {
				// Send move back to room
				room.Broadcast <- []byte(bestMove)
			}
		}
	}
}
