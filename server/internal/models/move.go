package models

import "time"

type Move struct {
	ID uint `gorm:"primaryKey"`

	GameID string `gorm:"index"`

	PlayerID uint `gorm:"index"`

	MoveNumber int

	FromSquare string `gorm:"size:2"`
	ToSquare   string `gorm:"size:2"`

	Promotion string `gorm:"size:1"` // q r b n

	SAN string `gorm:"size:20"` // e4, Nf3, Qg7#

	FEN string `gorm:"type:text"`

	CreatedAt time.Time
}
