package user

import (
	"github.com/datmedevil17/chesss/internal/database"
	"github.com/datmedevil17/chesss/internal/models"
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) GetByID(userID uint) (*models.User, error) {
	var user models.User
	err := database.GetDB().
		First(&user, userID).
		Error
	return &user, err
}

func (s *Service) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := database.GetDB().
		Where("email = ?", email).
		First(&user).
		Error
	return &user, err
}

func (s *Service) Create(user *models.User) error {
	return database.GetDB().Create(user).Error
}
