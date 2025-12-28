package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect(databaseURL string) error {
	var db *gorm.DB
	var err error
	var counts int

	for {
		db, err = gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
		if err != nil {
			log.Printf("Postgres not yet ready (%v)... retrying in 2 seconds", err)
			counts++
		} else {
			log.Println("Connected to Postgres successfully via GORM")
			break
		}

		if counts > 10 {
			return fmt.Errorf("failed to connect to database after retries: %v", err)
		}

		log.Println("Backing off for 2 seconds...")
		time.Sleep(2 * time.Second)
		continue
	}

	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("failed to get sqlDB: %v", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	if err = sqlDB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %v", err)
	}

	DB = db
	return nil
}

func GetDB() *gorm.DB {
	return DB
}