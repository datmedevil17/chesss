package models

import "time"

type AIGame struct {
	ID string `gorm:"primaryKey"`

	UserID uint `gorm:"index"`

	Difficulty int
	// 1–8 (Stockfish depth)

	FEN string `gorm:"type:text"`

	Status string
	// active | finished

	Result string
	// win | loss | draw

	CreatedAt time.Time
	FinishedAt *time.Time
}
