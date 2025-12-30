package game

import (
	"encoding/json"
	"log"
	"time"

	"github.com/datmedevil17/chesss/internal/database"
	"github.com/datmedevil17/chesss/internal/models"
	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

type Client struct {
	Conn   *websocket.Conn
	Send   chan []byte
	UserID uint
	Role   string // "white", "black", "spectator"
}

func (c *Client) ReadPump(room *GameRoom) {
	defer func() {
		room.Unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			log.Printf("Error unmarshalling message: %v", err)
			continue
		}

		log.Printf("Received message from User %d (%s): Type=%s Payload=%v", c.UserID, c.Role, wsMsg.Type, wsMsg.Payload)

		switch wsMsg.Type {
		case MsgMove:
			// Block spectators
			if c.Role == "spectator" {
				log.Printf("Ignored move from spectator %d", c.UserID)
				continue
			}

			// Security: Enforce Turn
			// If it's not this client's turn, ignore.
			// Bot is also a client with Role "black".
			if room.CurrentTurn != c.Role {
				log.Printf("Ignored out-of-turn move from %s (current turn: %s)", c.Role, room.CurrentTurn)
				continue
			}

			// First, deduct time from the player who just moved
			elapsed := int(time.Since(room.LastMoveTime).Seconds())
			if c.Role == "white" {
				room.WhiteTime -= elapsed
				if room.WhiteTime < 0 {
					room.WhiteTime = 0
				}
			} else {
				room.BlackTime -= elapsed
				if room.BlackTime < 0 {
					room.BlackTime = 0
				}
			}
			room.LastMoveTime = time.Now()

			// Update times in database
			now := time.Now()
			database.GetDB().Model(&models.Game{}).Where("id = ?", room.GameID).Updates(map[string]interface{}{
				"white_time_remaining": room.WhiteTime,
				"black_time_remaining": room.BlackTime,
				"last_move_at":         now,
			})

			// Toggle Turn
			if room.CurrentTurn == "white" {
				room.CurrentTurn = "black"
			} else {
				room.CurrentTurn = "white"
			}

			// Persist move to database
			moveStr, _ := wsMsg.Payload.(string)
			from := ""
			to := ""
			promo := ""
			if len(moveStr) >= 4 {
				from = moveStr[0:2]
				to = moveStr[2:4]
				if len(moveStr) > 4 {
					promo = string(moveStr[4])
				}
			}

			move := models.Move{
				GameID:     room.GameID,
				PlayerID:   c.UserID,
				MoveNumber: len(room.MoveHistory) + 1,
				FromSquare: from,
				ToSquare:   to,
				Promotion:  promo,
			}
			if err := database.GetDB().Create(&move).Error; err != nil {
				log.Printf("Failed to save move: %v", err)
			} else {
				log.Printf("Saved move %d: %s (White: %ds, Black: %ds)", move.MoveNumber, moveStr, room.WhiteTime, room.BlackTime)
			}
			room.MoveHistory = append(room.MoveHistory, moveStr)

			// Broadcast move with current times to everyone
			moveMsg := WSMessage{
				Type: MsgMove,
				Payload: MovePayload{
					Move:        moveStr,
					WhiteTime:   room.WhiteTime,
					BlackTime:   room.BlackTime,
					LastMoveAt:  room.LastMoveTime.UnixMilli(),
					CurrentTurn: room.CurrentTurn,
				},
			}
			moveMsgBytes, _ := json.Marshal(moveMsg)
			room.Broadcast <- moveMsgBytes
			log.Printf("Broadcasted move from %s to room %s", c.Role, room.GameID)

		case MsgChat:
			// Handle Chat
			// We need to inject the Sender name (which we don't track on Client struct yet, only Role)
			// Let's use Role as sender for now, or "User"

			// Payload in wsMsg is map[string]interface{} after unmarshal of interface{}
			// So we might need to be careful.
			// Actually, let's just re-broadcast the message but add timestamp/sender?
			// The simplest way for now: expecting client to send {type: chat, payload: {text: "..."}}

			// To do it properly:
			// 1. Parse Payload to extract text.
			// 2. Construct new ChatPayload with Server-side timestamp and Sender.
			// 3. Marshal and broadcast.

			// Simplified: Blind broadcast for now to get it working,
			// BUT the plan said "Server adds sender/timestamp".
			// Let's defer "Server adds sender" to the "Polish" phase if complexity is high.
			// No, let's do it.

			// Issue: wsMsg.Payload is map[string]interface{}.
			if payloadMap, ok := wsMsg.Payload.(map[string]interface{}); ok {
				if text, ok := payloadMap["text"].(string); ok {
					outMsg := WSMessage{
						Type: MsgChat,
						Payload: ChatPayload{
							Sender:    string(c.Role), // Use role (white/black) as sender for now
							Text:      text,
							Timestamp: time.Now().Format(time.RFC3339),
						},
					}
					if bytes, err := json.Marshal(outMsg); err == nil {
						room.Broadcast <- bytes
					}
				}
			}

		case MsgGameOver:
			// Handle game end - update database
			if payloadMap, ok := wsMsg.Payload.(map[string]interface{}); ok {
				result := ""
				reason := ""
				winner := ""
				if r, ok := payloadMap["result"].(string); ok {
					result = r
				}
				if r, ok := payloadMap["reason"].(string); ok {
					reason = r
				}
				if w, ok := payloadMap["winner"].(string); ok {
					winner = w
				}

				now := time.Now()
				database.GetDB().Model(&models.Game{}).Where("id = ?", room.GameID).Updates(map[string]interface{}{
					"status":      "finished",
					"result":      result,
					"reason":      reason,
					"finished_at": now,
				})
				log.Printf("Game %s ended: Result=%s, Reason=%s, Winner=%s", room.GameID, result, reason, winner)

				// Broadcast game_over to all clients
				room.Broadcast <- message
			}

		default:
			log.Printf("Unknown message type: %s", wsMsg.Type)
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
