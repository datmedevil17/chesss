package matchmaking

type JoinQueueRequest struct {
	Mode        string `json:"mode"`         // blitz | rapid | bullet
	TimeControl string `json:"time_control"` // 5+0, 3+2
	Rating      int    `json:"rating"`
}

type MatchFoundResponse struct {
	GameID string `json:"game_id"`
}
