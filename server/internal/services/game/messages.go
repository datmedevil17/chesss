package game

type MessageType string

const (
	MsgInit  MessageType = "init"
	MsgMove  MessageType = "move"
	MsgChat  MessageType = "chat"
	MsgError MessageType = "error"
)

type WSMessage struct {
	Type    MessageType `json:"type"`
	Payload interface{} `json:"payload"`
}

type InitPayload struct {
	FEN     string   `json:"fen"`
	History []string `json:"history"`
	WhiteID uint     `json:"white_id"`
	BlackID uint     `json:"black_id"`
	Status  string   `json:"status"`
	Color   string   `json:"color"` // Color of the connected client
}

type ChatPayload struct {
	Sender    string `json:"sender"`
	Text      string `json:"text"`
	Timestamp string `json:"timestamp"` // ISO string
}
