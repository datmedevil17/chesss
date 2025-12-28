package models

import "time"

type MatchmakingQueue struct {
	ID uint `gorm:"primaryKey"`

	UserID uint `gorm:"uniqueIndex"`

	Mode string
	// bullet | blitz | rapid

	MinRating int
	MaxRating int

	TimeControl string

	JoinedAt time.Time
}
