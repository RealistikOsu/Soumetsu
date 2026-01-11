// Package user provides user management services.
package user

import (
	"context"
	"image"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/RealistikOsu/soumetsu/internal/pkg/validation"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
	"github.com/RealistikOsu/soumetsu/internal/services"
	"github.com/nfnt/resize"
)

// Service provides user management operations.
type Service struct {
	config      *config.Config
	userRepo    *repositories.UserRepository
	bgRepo      *repositories.ProfileBackgroundRepository
	discordRepo *repositories.DiscordRepository
	redis       *redis.Client
}

// NewService creates a new user service.
func NewService(
	cfg *config.Config,
	userRepo *repositories.UserRepository,
	bgRepo *repositories.ProfileBackgroundRepository,
	discordRepo *repositories.DiscordRepository,
	redisClient *redis.Client,
) *Service {
	return &Service{
		config:      cfg,
		userRepo:    userRepo,
		bgRepo:      bgRepo,
		discordRepo: discordRepo,
		redis:       redisClient,
	}
}

// GetByID gets a user by ID.
func (s *Service) GetByID(ctx context.Context, id int) (*models.User, error) {
	return s.userRepo.FindByID(ctx, id)
}

// GetByUsername gets a user by username.
func (s *Service) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	return s.userRepo.FindByUsername(ctx, username)
}

// ChangeUsernameInput represents username change request data.
type ChangeUsernameInput struct {
	UserID      int
	NewUsername string
}

// ChangeUsername changes a user's username.
func (s *Service) ChangeUsername(ctx context.Context, input ChangeUsernameInput) error {
	// Validate new username
	if !validation.ValidateUsername(input.NewUsername) {
		return services.NewBadRequest("Your username must contain alphanumerical characters, spaces, or any of _[]-")
	}

	// Get current user
	user, err := s.userRepo.FindByID(ctx, input.UserID)
	if err != nil {
		return err
	}
	if user == nil {
		return services.ErrNotFound
	}

	// Check if username already exists
	exists, err := s.userRepo.UsernameExists(ctx, input.NewUsername)
	if err != nil {
		return err
	}
	if exists {
		return services.NewConflict("An user with that username already exists!")
	}

	// Check username history
	exists, err = s.userRepo.UsernameInHistory(ctx, input.NewUsername)
	if err != nil {
		return err
	}
	if exists {
		return services.NewConflict("This username has been reserved by another user.")
	}

	// Record username change in history
	if err := s.userRepo.RecordUsernameChange(ctx, input.UserID, user.Username, input.NewUsername, time.Now().Unix()); err != nil {
		return err
	}

	// Update username
	return s.userRepo.UpdateUsername(ctx, input.UserID, input.NewUsername)
}

// ChangePasswordInput represents password change request data.
type ChangePasswordInput struct {
	UserID          int
	CurrentPassword string
	NewPassword     string
	NewEmail        string
}

// ChangePassword changes a user's password and/or email.
func (s *Service) ChangePassword(ctx context.Context, input ChangePasswordInput) error {
	// Get current user
	user, err := s.userRepo.FindByID(ctx, input.UserID)
	if err != nil {
		return err
	}
	if user == nil {
		return services.ErrNotFound
	}

	// Verify current password
	if !crypto.VerifyPassword(input.CurrentPassword, user.Password) {
		return services.NewBadRequest("Wrong password.")
	}

	// Update email if provided
	if input.NewEmail != "" {
		if err := s.userRepo.UpdateEmail(ctx, input.UserID, input.NewEmail); err != nil {
			return err
		}
	}

	// Update password if provided
	if input.NewPassword != "" {
		if err := validation.ValidatePassword(input.NewPassword); err != nil {
			return services.NewBadRequest(err.Error())
		}

		hashedPassword, err := crypto.HashPassword(input.NewPassword)
		if err != nil {
			return err
		}

		if err := s.userRepo.UpdatePassword(ctx, input.UserID, hashedPassword); err != nil {
			return err
		}

		// Publish password change event
		s.redis.Publish(ctx, "peppy:change_pass", `{"user_id": `+string(rune(input.UserID))+`}`)
	}

	// Clear flags
	s.userRepo.ClearFlags(ctx, input.UserID, 3)

	return nil
}

// UploadAvatar uploads a new avatar for a user.
func (s *Service) UploadAvatar(ctx context.Context, userID int, file io.Reader, contentType string) error {
	// Decode image
	img, _, err := image.Decode(file)
	if err != nil {
		return services.NewBadRequest("Invalid image format")
	}

	// Resize to 256x256
	resized := resize.Resize(256, 256, img, resize.Lanczos3)

	// Create output file
	outputPath := filepath.Join(s.config.App.AvatarsPath, string(rune(userID))+".png")
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	// Encode as PNG
	return png.Encode(outFile, resized)
}

// SetProfileBackground sets a user's profile background.
func (s *Service) SetProfileBackground(ctx context.Context, userID int, bgType string, value string) error {
	var typeInt int
	switch bgType {
	case "none":
		typeInt = 0
		value = ""
	case "image":
		typeInt = 1
	case "color":
		typeInt = 0
		if !validation.ValidateHexColor(value) {
			return services.NewBadRequest("Invalid hex color format")
		}
	default:
		return services.NewBadRequest("Invalid background type")
	}

	return s.bgRepo.SetBackground(ctx, userID, typeInt, value)
}

// UploadProfileBanner uploads a profile banner image.
func (s *Service) UploadProfileBanner(ctx context.Context, userID int, file io.Reader) error {
	// Decode image
	img, _, err := image.Decode(file)
	if err != nil {
		return services.NewBadRequest("Invalid image format")
	}

	// Create output file
	outputPath := filepath.Join(s.config.App.BannersPath, string(rune(userID))+".png")
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	// Encode as PNG
	if err := png.Encode(outFile, img); err != nil {
		return err
	}

	// Set background type to image
	return s.bgRepo.SetBackground(ctx, userID, 1, "")
}

// UnlinkDiscord removes a user's Discord link.
func (s *Service) UnlinkDiscord(ctx context.Context, userID int) error {
	linked, err := s.discordRepo.IsLinked(ctx, userID)
	if err != nil {
		return err
	}
	if !linked {
		return services.NewNotFound("You have no Discord account linked to your account!")
	}

	return s.discordRepo.Unlink(ctx, userID)
}

// LinkDiscord links a Discord account to a user.
func (s *Service) LinkDiscord(ctx context.Context, userID int, discordID string) error {
	return s.discordRepo.Link(ctx, userID, discordID)
}

// GetClanMembership gets a user's clan membership.
func (s *Service) GetClanMembership(ctx context.Context, userID int) (*models.ClanMembership, error) {
	return s.userRepo.GetClanMembership(ctx, userID)
}

// SafeUsername converts a username to its safe format.
func SafeUsername(username string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(username)), " ", "_")
}
