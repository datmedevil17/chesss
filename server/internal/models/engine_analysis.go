package models

import "time"

type EngineAnalysis struct {
	ID uint `gorm:"primaryKey"`

	GameID string `gorm:"index"`
	MoveID *uint  `gorm:"index"`

	FEN string `gorm:"type:text"`

	Depth int

	Evaluation int
	// centipawns (positive = white advantage)

	BestMove string `gorm:"size:10"`

	CreatedAt time.Time
}
