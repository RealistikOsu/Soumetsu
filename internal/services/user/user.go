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

type Service struct {
	config      *config.Config
	userRepo    *repositories.UserRepository
	bgRepo      *repositories.ProfileBackgroundRepository
	discordRepo *repositories.DiscordRepository
	redis       *redis.Client
}

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

func (s *Service) GetByID(ctx context.Context, id int) (*models.User, error) {
	return s.userRepo.FindByID(ctx, id)
}

func (s *Service) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	return s.userRepo.FindByUsername(ctx, username)
}

type ChangeUsernameInput struct {
	UserID      int
	NewUsername string
}

func (s *Service) ChangeUsername(ctx context.Context, input ChangeUsernameInput) error {
	if !validation.ValidateUsername(input.NewUsername) {
		return services.NewBadRequest("Your username must contain alphanumerical characters, spaces, or any of _[]-")
	}

	user, err := s.userRepo.FindByID(ctx, input.UserID)
	if err != nil {
		return err
	}
	if user == nil {
		return services.ErrNotFound
	}

	exists, err := s.userRepo.UsernameExists(ctx, input.NewUsername)
	if err != nil {
		return err
	}
	if exists {
		return services.NewConflict("An user with that username already exists!")
	}

	exists, err = s.userRepo.UsernameInHistory(ctx, input.NewUsername)
	if err != nil {
		return err
	}
	if exists {
		return services.NewConflict("This username has been reserved by another user.")
	}

	if err := s.userRepo.RecordUsernameChange(ctx, input.UserID, user.Username, input.NewUsername, time.Now().Unix()); err != nil {
		return err
	}

	return s.userRepo.UpdateUsername(ctx, input.UserID, input.NewUsername)
}

type ChangePasswordInput struct {
	UserID          int
	CurrentPassword string
	NewPassword     string
	NewEmail        string
}

func (s *Service) ChangePassword(ctx context.Context, input ChangePasswordInput) error {
	user, err := s.userRepo.FindByID(ctx, input.UserID)
	if err != nil {
		return err
	}
	if user == nil {
		return services.ErrNotFound
	}

	if !crypto.VerifyPassword(input.CurrentPassword, user.Password) {
		return services.NewBadRequest("Wrong password.")
	}

	if input.NewEmail != "" {
		if err := s.userRepo.UpdateEmail(ctx, input.UserID, input.NewEmail); err != nil {
			return err
		}
	}

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

		s.redis.Publish(ctx, "peppy:change_pass", `{"user_id": `+string(rune(input.UserID))+`}`)
	}

	s.userRepo.ClearFlags(ctx, input.UserID, 3)

	return nil
}

func (s *Service) UploadAvatar(ctx context.Context, userID int, file io.Reader, contentType string) error {
	img, _, err := image.Decode(file)
	if err != nil {
		return services.NewBadRequest("Invalid image format")
	}

	resized := resize.Resize(256, 256, img, resize.Lanczos3)

	outputPath := filepath.Join(s.config.App.AvatarsPath, string(rune(userID))+".png")
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	return png.Encode(outFile, resized)
}

func (s *Service) SetProfileBackground(ctx context.Context, userID int, bgType string, value string) error {
	var typeInt int
	switch bgType {
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

func (s *Service) GetProfileBackground(ctx context.Context, userID int) (int, string, error) {
	return s.bgRepo.GetBackground(ctx, userID)
}

func (s *Service) UploadProfileBanner(ctx context.Context, userID int, file io.Reader) error {
	img, _, err := image.Decode(file)
	if err != nil {
		return services.NewBadRequest("Invalid image format")
	}

	outputPath := filepath.Join(s.config.App.BannersPath, string(rune(userID))+".png")
	outFile, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	if err := png.Encode(outFile, img); err != nil {
		return err
	}

	return s.bgRepo.SetBackground(ctx, userID, 1, "")
}

func (s *Service) GetUserpage(ctx context.Context, userID int) (string, error) {
	return s.userRepo.GetUserpage(ctx, userID)
}

func (s *Service) UpdateUserpage(ctx context.Context, userID int, content string) error {
	// Optional: Add validation for content length here
	return s.userRepo.UpdateUserpage(ctx, userID, content)
}

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

func (s *Service) LinkDiscord(ctx context.Context, userID int, discordID string) error {
	return s.discordRepo.Link(ctx, userID, discordID)
}

func (s *Service) GetClanMembership(ctx context.Context, userID int) (*models.ClanMembership, error) {
	return s.userRepo.GetClanMembership(ctx, userID)
}

func SafeUsername(username string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(username)), " ", "_")
}
