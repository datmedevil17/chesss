package api

import (
	"github.com/datmedevil17/chesss/internal/config"
	"github.com/datmedevil17/chesss/internal/handlers/game"
	"github.com/datmedevil17/chesss/internal/handlers/matchmaking"
	"github.com/datmedevil17/chesss/internal/handlers/user"
	"github.com/datmedevil17/chesss/internal/middleware"
	"github.com/gin-gonic/gin"
)

func InitRouter(cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// Middleware
	r.Use(middleware.CORSMiddleware())

	// Handlers
	userHandler := user.NewHandler()
	matchmakingHandler := matchmaking.NewHandler()
	gameHandler := game.NewHandler()

	api := r.Group("/api/v1")
	{
		// Auth Routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", userHandler.Register)
			auth.POST("/login", userHandler.Login)
			auth.GET("/me", middleware.AuthMiddleware(cfg.JWTSecret), userHandler.Me)
		}

		// Matchmaking Routes
		mm := api.Group("/matchmaking")
		mm.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			mm.POST("/join", matchmakingHandler.Join)
			mm.POST("/leave", matchmakingHandler.Leave)
		}

		// Game Routes
		g := api.Group("/game")
		{
			g.GET("/ws/:gameId", gameHandler.WSHandler)
		}
	}

	return r
}
