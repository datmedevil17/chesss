package models

import "time"

type Rating struct {
	ID     uint `gorm:"primaryKey"`

	UserID uint `gorm:"index;not null"`
	User   User `gorm:"foreignKey:UserID"`

	Mode   string `gorm:"size:20;index"` // bullet | blitz | rapid
	Value  int    `gorm:"default:1200"`

	GamesPlayed int `gorm:"default:0"`
	Wins        int `gorm:"default:0"`
	Losses      int `gorm:"default:0"`
	Draws       int `gorm:"default:0"`

	UpdatedAt time.Time
}
