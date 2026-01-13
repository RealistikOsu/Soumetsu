package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/RealistikOsu/soumetsu/internal/adapters/api"
	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
	"github.com/RealistikOsu/soumetsu/internal/services"
)

func generateRandomToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

type Service struct {
	config    *config.Config
	apiClient *api.Client
	tokenRepo *repositories.TokenRepository
	userRepo  *repositories.UserRepository
	redis     *redis.Client
}

func NewService(
	cfg *config.Config,
	apiClient *api.Client,
	tokenRepo *repositories.TokenRepository,
	userRepo *repositories.UserRepository,
	redisClient *redis.Client,
) *Service {
	return &Service{
		config:    cfg,
		apiClient: apiClient,
		tokenRepo: tokenRepo,
		userRepo:  userRepo,
		redis:     redisClient,
	}
}

type LoginInput struct {
	Username string
	Password string
	Captcha  string
}

type LoginResult struct {
	UserID     int
	Username   string
	Token      string
	Privileges int
}

func (s *Service) Login(ctx context.Context, input LoginInput) (*LoginResult, error) {
	resp, err := s.apiClient.Login(ctx, &api.LoginRequest{
		Username: input.Username,
		Password: input.Password,
		Captcha:  input.Captcha,
	})
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			switch apiErr.Code {
			case "auth.invalid_credentials":
				return nil, services.NewBadRequest("Wrong username or password.")
			case "auth.pending_verification":
				userID := extractUserIDFromError(apiErr)
				return nil, &PendingVerificationError{UserID: userID}
			case "auth.banned":
				return nil, services.NewForbidden("You are not allowed to login. This means your account is either banned or locked.")
			case "auth.captcha_failed":
				return nil, services.NewBadRequest("Captcha verification failed.")
			default:
				return nil, services.NewBadRequest(apiErr.Code)
			}
		}
		return nil, err
	}

	return &LoginResult{
		UserID:     resp.UserID,
		Username:   resp.Username,
		Token:      resp.Token,
		Privileges: resp.Privileges,
	}, nil
}

func extractUserIDFromError(err *api.APIError) int {
	return 0
}

type PendingVerificationError struct {
	UserID int
}

func (e *PendingVerificationError) Error() string {
	return "Account pending verification"
}

type RegisterInput struct {
	Username string
	Email    string
	Password string
	Captcha  string
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (int, error) {
	resp, err := s.apiClient.Register(ctx, &api.RegisterRequest{
		Username: input.Username,
		Email:    input.Email,
		Password: input.Password,
		Captcha:  input.Captcha,
	})
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			switch apiErr.Code {
			case "auth.registration_disabled":
				return 0, services.NewForbidden("Sorry, it's not possible to register at the moment.")
			case "auth.invalid_username":
				return 0, services.NewBadRequest("Your username must contain alphanumerical characters, spaces, or any of _[]-")
			case "auth.username_taken":
				return 0, services.NewConflict("An user with that username already exists!")
			case "auth.email_taken":
				return 0, services.NewConflict("An user with that email address already exists!")
			case "auth.weak_password":
				return 0, services.NewBadRequest("Your password is too weak.")
			case "auth.captcha_failed":
				return 0, services.NewBadRequest("Captcha verification failed.")
			default:
				return 0, services.NewBadRequest(apiErr.Code)
			}
		}
		return 0, err
	}

	return resp.UserID, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	return s.apiClient.Logout(ctx, token)
}

func (s *Service) ValidateSession(ctx context.Context, token string) (*api.SessionResponse, error) {
	return s.apiClient.GetSession(ctx, token)
}

func (s *Service) SetIdentityCookie(ctx context.Context, userID int) (string, error) {
	// Try to get existing identity token
	existingToken, err := s.tokenRepo.GetIdentityToken(ctx, userID)
	if err != nil {
		return "", err
	}
	if existingToken != "" {
		return existingToken, nil
	}

	// Generate new token if none exists
	newToken := generateRandomToken()
	if err := s.tokenRepo.CreateIdentityToken(ctx, userID, newToken); err != nil {
		return "", err
	}
	return newToken, nil
}

func (s *Service) ValidateIdentityToken(ctx context.Context, token string, userID int) (bool, error) {
	return s.tokenRepo.ValidateIdentityToken(ctx, token, userID)
}

func (s *Service) CheckMultiAccount(ctx context.Context, ip, identityToken string) (string, string, error) {
	username, err := s.tokenRepo.GetUsernameByIP(ctx, ip)
	if err != nil {
		return "", "", err
	}
	if username != "" {
		return username, "IP", nil
	}

	if identityToken != "" {
		username, err = s.tokenRepo.GetUsernameByIdentityToken(ctx, identityToken)
		if err != nil {
			return "", "", err
		}
		if username != "" {
			return username, "identity token", nil
		}
	}

	return "", "", nil
}

func (s *Service) LogIP(ctx context.Context, userID int, ip string) error {
	return s.tokenRepo.LogIP(ctx, userID, ip)
}

func (s *Service) SetCountry(ctx context.Context, userID int, ip string) error {
	resp, err := http.Get(s.config.Security.IPLookupURL + "/" + ip + "/country")
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	country := strings.TrimSpace(string(data))
	if country == "" || len(country) != 2 {
		return nil
	}

	return s.userRepo.UpdateCountry(ctx, userID, country)
}

func (s *Service) PublishPasswordChange(ctx context.Context, userID int) {
	s.redis.Publish(ctx, "peppy:change_pass", fmt.Sprintf(`{"user_id": %d}`, userID))
}

func (s *Service) PublishClanUpdate(ctx context.Context, userID int) {
	s.redis.Publish(ctx, "rosu:clan_update", strconv.Itoa(userID))
}
