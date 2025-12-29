package main

import (
	"log"

	"github.com/datmedevil17/chesss/internal/api"
	"github.com/datmedevil17/chesss/internal/config"
	"github.com/datmedevil17/chesss/internal/database"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if err := database.Connect(cfg.DatabaseURL); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if err := database.Migrate(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	r := api.InitRouter(cfg)

	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(cfg.Port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
