package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func LoadConfig() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		log.Printf("Failed to load environment variables: %v", err)
	}

	port := getEnv("PORT", "8080")
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", ""),
		Port:        port,
	}, nil
}

func (c *Config) Validate() error {
	if c.DatabaseURL == "" {
		log.Printf("DATABASE_URL is not set")
	}
	if c.JWTSecret == "" {
		log.Printf("JWT_SECRET is not set")
	}
	return nil
}