package models

import "time"

type Spectator struct {
	ID uint `gorm:"primaryKey"`

	GameID string `gorm:"index"`
	UserID uint  `gorm:"index"`

	JoinedAt time.Time
}
