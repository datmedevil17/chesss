package user

import (
	"net/http"

	"github.com/datmedevil17/chesss/internal/models"
	"github.com/datmedevil17/chesss/internal/services/user"
	"github.com/datmedevil17/chesss/internal/utils"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *user.Service
}

func NewHandler() *Handler {
	return &Handler{
		service: user.NewService(),
	}
}

func (h *Handler) Me(c *gin.Context) {
	userID := c.GetUint("userID")

	u, err := h.service.GetByID(userID)
	if err != nil {
		utils.ErrorResponse(c, 404, "User not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "User fetched", UserResponse{
		ID:       u.ID,
		Email:    u.Email,
		Username: u.Username,
	})
}

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	// Check if user exists
	if _, err := h.service.GetByEmail(req.Email); err == nil {
		utils.ErrorResponse(c, http.StatusConflict, "User already exists")
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	user := &models.User{ // Use concrete type
		Email:    req.Email,
		Username: req.Username,
		Password: hashedPassword,
	}

	if err := h.service.Create(user); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	token, err := utils.GenerateToken(user.Email, user.ID, "dev_secret") // TODO: Use config secret
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "User registered", LoginResponse{
		Token: token,
		User: UserResponse{
			ID:       user.ID,
			Email:    user.Email,
			Username: user.Username,
		},
	})
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.service.GetByEmail(req.Email)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.Password) {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	token, err := utils.GenerateToken(user.Email, user.ID, "dev_secret") // TODO: Use config secret
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", LoginResponse{
		Token: token,
		User: UserResponse{
			ID:       user.ID,
			Email:    user.Email,
			Username: user.Username,
		},
	})
}
