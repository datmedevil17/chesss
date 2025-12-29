package matchmaking

import (
	"errors"
	"time"

	"github.com/datmedevil17/chesss/internal/database"
	"github.com/datmedevil17/chesss/internal/models"
	"github.com/google/uuid"
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

// Join queue
func (s *Service) JoinQueue(
	userID uint,
	mode string,
	timeControl string,
	rating int,
) error {

	entry := &models.MatchmakingQueue{
		UserID:      userID,
		Mode:        mode,
		TimeControl: timeControl,
		MinRating:   rating - 100,
		MaxRating:   rating + 100,
		JoinedAt:    time.Now(),
	}

	return database.GetDB().Create(entry).Error
}

// Leave queue
func (s *Service) LeaveQueue(userID uint) error {
	return database.GetDB().
		Where("user_id = ?", userID).
		Delete(&models.MatchmakingQueue{}).
		Error
}

// Try to match user
func (s *Service) TryMatch(userID uint) (*models.Game, error) {
	var player models.MatchmakingQueue
	if err := database.GetDB().
		Where("user_id = ?", userID).
		First(&player).Error; err != nil {
		return nil, errors.New("not in queue")
	}

	var opponent models.MatchmakingQueue
	err := database.GetDB().
		Where(`
			mode = ?
			AND time_control = ?
			AND user_id != ?
			AND min_rating <= ?
			AND max_rating >= ?
		`,
			player.Mode,
			player.TimeControl,
			player.UserID,
			player.MaxRating,
			player.MinRating,
		).
		Order("joined_at ASC").
		First(&opponent).Error

	if err != nil {
		return nil, errors.New("no opponent yet")
	}

	// Create game
	// Randomize Color
	var whiteID, blackID uint
	if time.Now().UnixNano()%2 == 0 {
		whiteID = player.UserID
		blackID = opponent.UserID
	} else {
		whiteID = opponent.UserID
		blackID = player.UserID
	}

	game := &models.Game{
		ID:          uuid.NewString(),
		WhiteID:     whiteID,
		BlackID:     blackID,
		Status:      "active",
		Mode:        player.Mode,
		TimeControl: player.TimeControl,
		FEN:         "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
		StartedAt:   ptrTime(time.Now()),
	}

	tx := database.GetDB().Begin()
	if err := tx.Create(game).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Where("user_id IN ?", []uint{
		player.UserID,
		opponent.UserID,
	}).Delete(&models.MatchmakingQueue{})

	tx.Commit()

	return game, nil
}

// Check if user has an active match (polling)
func (s *Service) CheckActiveMatch(userID uint) (*models.Game, error) {
	var game models.Game
	if err := database.GetDB().
		Where("(white_id = ? OR black_id = ?) AND status = 'active'", userID, userID).
		Order("started_at DESC").
		First(&game).Error; err != nil {
		return nil, err
	}
	return &game, nil
}

func ptrTime(t time.Time) *time.Time {
	return &t
}
