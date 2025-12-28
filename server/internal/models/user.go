package models

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey"`
	Email     string    `gorm:"uniqueIndex;not null"`
	Username  string    `gorm:"uniqueIndex;not null"`
	Password  string    `gorm:"not null"`

	IsBanned  bool      `gorm:"default:false"`

	CreatedAt time.Time
	UpdatedAt time.Time
}
