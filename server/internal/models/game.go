package models

import "time"

type Game struct {
	ID string `gorm:"primaryKey"` // UUID

	WhiteID uint
	BlackID uint

	White User `gorm:"foreignKey:WhiteID"`
	Black User `gorm:"foreignKey:BlackID"`

	Status string `gorm:"index"`
	// waiting | active | finished

	Result string
	// 1-0 | 0-1 | 1/2-1/2 | *

	Reason string
	// checkmate | resign | timeout | draw

	Mode string
	// bullet | blitz | rapid | ai

	TimeControl string
	// 5+0, 3+2, etc.

	FEN string `gorm:"type:text"`

	Moves []Move `gorm:"foreignKey:GameID"`

	// Time tracking (in seconds)
	WhiteTimeRemaining int        `gorm:"default:600"` // Default 10 minutes
	BlackTimeRemaining int        `gorm:"default:600"`
	LastMoveAt         *time.Time // When last move was made (for calculating elapsed time)

	StartedAt  *time.Time
	FinishedAt *time.Time

	CreatedAt time.Time
}
