package database

import (
	"log"

	"github.com/datmedevil17/chesss/internal/models"
)

func Migrate() error {
	err := DB.AutoMigrate(&models.User{}, &models.AIGame{}, &models.EngineAnalysis{}, &models.Game{}, &models.MatchmakingQueue{}, &models.Move{}, &models.Rating{}, &models.Spectator{})
	if err != nil {
		log.Fatal("❌ Migration failed:", err)
	}
	log.Println("Migrations completed successfully")
	return nil
}