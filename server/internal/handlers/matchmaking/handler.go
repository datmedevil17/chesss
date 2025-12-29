package matchmaking

import (
	"net/http"

	"github.com/datmedevil17/chesss/internal/services/matchmaking"
	"github.com/datmedevil17/chesss/internal/utils"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *matchmaking.Service
}

func NewHandler() *Handler {
	return &Handler{
		service: matchmaking.NewService(),
	}
}

func (h *Handler) Join(c *gin.Context) {
	userID := c.GetUint("userID")

	var req JoinQueueRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	if err := h.service.JoinQueue(
		userID,
		req.Mode,
		req.TimeControl,
		req.Rating,
	); err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	// Try matching immediately
	game, err := h.service.TryMatch(userID)
	if err == nil {
		color := "black"
		if game.WhiteID == userID {
			color = "white"
		}
		utils.SuccessResponse(c, http.StatusOK, "Match found",
			MatchFoundResponse{
				GameID: game.ID,
				Color:  color,
			})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Joined queue", nil)
}

func (h *Handler) Leave(c *gin.Context) {
	userID := c.GetUint("userID")

	if err := h.service.LeaveQueue(userID); err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Left queue", nil)
}

func (h *Handler) CheckActiveMatch(c *gin.Context) {
	userID := c.GetUint("userID")

	game, err := h.service.CheckActiveMatch(userID)
	if err != nil {
		utils.ErrorResponse(c, 404, "No active match found")
		return
	}

	color := "black"
	if game.WhiteID == userID {
		color = "white"
	}

	utils.SuccessResponse(c, http.StatusOK, "Active match found",
		MatchFoundResponse{
			GameID: game.ID,
			Color:  color,
		})
}
