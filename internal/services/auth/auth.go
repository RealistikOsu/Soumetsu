// Package auth provides authentication services.
package auth

import (
	"context"
	"crypto/sha256"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/RealistikOsu/soumetsu/internal/adapters/mail"
	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/RealistikOsu/soumetsu/internal/pkg/validation"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
	"github.com/RealistikOsu/soumetsu/internal/services"
	"zxq.co/x/rs"
)

// Service provides authentication operations.
type Service struct {
	config     *config.Config
	userRepo   *repositories.UserRepository
	tokenRepo  *repositories.TokenRepository
	statsRepo  *repositories.StatsRepository
	systemRepo *repositories.SystemRepository
	mail       *mail.Client
	redis      *redis.Client
}

// NewService creates a new auth service.
func NewService(
	cfg *config.Config,
	userRepo *repositories.UserRepository,
	tokenRepo *repositories.TokenRepository,
	statsRepo *repositories.StatsRepository,
	systemRepo *repositories.SystemRepository,
	mailClient *mail.Client,
	redisClient *redis.Client,
) *Service {
	return &Service{
		config:     cfg,
		userRepo:   userRepo,
		tokenRepo:  tokenRepo,
		statsRepo:  statsRepo,
		systemRepo: systemRepo,
		mail:       mailClient,
		redis:      redisClient,
	}
}

// LoginInput represents login request data.
type LoginInput struct {
	Username string
	Password string
}

// LoginResult represents the result of a successful login.
type LoginResult struct {
	User      *repositories.UserForLogin
	Token     string
	ClanID    int
	ClanOwner bool
}

// Login authenticates a user.
func (s *Service) Login(ctx context.Context, input LoginInput) (*LoginResult, error) {
	user, err := s.userRepo.FindForLogin(ctx, input.Username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		param := "username"
		if strings.Contains(input.Username, "@") {
			param = "email"
		}
		return nil, services.NewNotFound(fmt.Sprintf("No user with such %s!", param))
	}

	// Check password version
	if user.PasswordVersion == 1 {
		return nil, services.NewBadRequest("Your password is sooooooo old, that we don't even know how to deal with it anymore. Could you please change it?")
	}

	// Verify password
	if !crypto.VerifyPassword(input.Password, user.Password) {
		return nil, services.NewBadRequest("Wrong password.")
	}

	// Check if pending verification
	if user.Privileges&common.UserPrivilegePendingVerification > 0 {
		return nil, &PendingVerificationError{UserID: user.ID}
	}

	// Check if banned
	if user.Privileges&common.UserPrivilegeNormal == 0 {
		return nil, services.NewForbidden("You are not allowed to login. This means your account is either banned or locked.")
	}

	// Get clan membership
	membership, _ := s.userRepo.GetClanMembership(ctx, user.ID)
	var clanID int
	var clanOwner bool
	if membership != nil {
		clanID = membership.ClanID
		clanOwner = membership.IsClanOwner()
	}

	return &LoginResult{
		User:      user,
		ClanID:    clanID,
		ClanOwner: clanOwner,
	}, nil
}

// PendingVerificationError indicates the user needs to verify their account.
type PendingVerificationError struct {
	UserID int
}

func (e *PendingVerificationError) Error() string {
	return "Account pending verification"
}

// RegisterInput represents registration request data.
type RegisterInput struct {
	Username string
	Email    string
	Password string
}

// Register creates a new user account.
func (s *Service) Register(ctx context.Context, input RegisterInput) (int64, error) {
	// Check registrations are enabled
	enabled, err := s.systemRepo.RegistrationsEnabled(ctx)
	if err != nil || !enabled {
		return 0, services.NewForbidden("Sorry, it's not possible to register at the moment. Please try again later.")
	}

	// Validate username
	if !validation.ValidateUsername(input.Username) {
		return 0, services.NewBadRequest("Your username must contain alphanumerical characters, spaces, or any of _[]-")
	}

	// Check forbidden usernames
	if isForbiddenUsername(input.Username) {
		return 0, services.NewBadRequest("You're not allowed to register with that username.")
	}

	// Check for mixed underscores and spaces
	if strings.Contains(input.Username, "_") && strings.Contains(input.Username, " ") {
		return 0, services.NewBadRequest("An username can't contain both underscores and spaces.")
	}

	// Validate password
	if err := validation.ValidatePassword(input.Password); err != nil {
		return 0, services.NewBadRequest(err.Error())
	}

	// Check username exists
	exists, err := s.userRepo.UsernameExists(ctx, input.Username)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, services.NewConflict("An user with that username already exists!")
	}

	// Check email exists
	exists, err = s.userRepo.EmailExists(ctx, input.Email)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, services.NewConflict("An user with that email address already exists!")
	}

	// Check username history
	exists, err = s.userRepo.UsernameInHistory(ctx, input.Username)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, services.NewConflict("This username has been reserved by another user.")
	}

	// Hash password
	hashedPassword, err := crypto.HashPassword(input.Password)
	if err != nil {
		return 0, err
	}

	// Generate API key
	apiKey, _ := crypto.GenerateRandomString(64)

	// Create user
	userID, err := s.userRepo.Create(ctx, input.Username, input.Email, hashedPassword, apiKey,
		common.UserPrivilegePendingVerification, time.Now().Unix())
	if err != nil {
		return 0, err
	}

	// Initialize stats
	if err := s.statsRepo.InitializeUserStats(ctx, userID, input.Username); err != nil {
		// Non-fatal error
	}

	// Increment registered users counter
	s.redis.Client.Incr("ripple:registered_users")

	return userID, nil
}

// GenerateAPIToken generates a new API token for a user.
func (s *Service) GenerateAPIToken(ctx context.Context, userID int, clientIP string) (string, error) {
	token := common.RandomString(32)
	tokenHash := crypto.MD5(token)

	err := s.tokenRepo.CreateAPIToken(ctx, userID, clientIP, tokenHash)
	if err != nil {
		return "", err
	}
	return token, nil
}

// CheckOrGenerateToken checks if a token exists, or generates a new one.
func (s *Service) CheckOrGenerateToken(ctx context.Context, token string, userID int, clientIP string) (string, error) {
	if token == "" {
		return s.GenerateAPIToken(ctx, userID, clientIP)
	}

	exists, err := s.tokenRepo.TokenExists(ctx, crypto.MD5(token))
	if err != nil {
		return "", err
	}
	if !exists {
		return s.GenerateAPIToken(ctx, userID, clientIP)
	}
	return token, nil
}

// SetIdentityCookie gets or creates an identity token for a user.
func (s *Service) SetIdentityCookie(ctx context.Context, userID int) (string, error) {
	// Check for existing token
	token, err := s.tokenRepo.GetIdentityToken(ctx, userID)
	if err != nil {
		return "", err
	}
	if token != "" {
		return token, nil
	}

	// Generate new token
	for {
		hash := sha256.Sum256([]byte(rs.String(32)))
		token = fmt.Sprintf("%x", hash)
		exists, err := s.tokenRepo.IdentityTokenExists(ctx, token)
		if err != nil {
			return "", err
		}
		if !exists {
			break
		}
	}

	if err := s.tokenRepo.CreateIdentityToken(ctx, userID, token); err != nil {
		return "", err
	}
	return token, nil
}

// LogIP logs a user's IP address.
func (s *Service) LogIP(ctx context.Context, userID int, ip string) error {
	return s.tokenRepo.LogIP(ctx, userID, ip)
}

// SetCountry sets a user's country based on IP.
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

// RequestPasswordReset initiates a password reset.
func (s *Service) RequestPasswordReset(ctx context.Context, identifier string) error {
	user, err := s.userRepo.FindByUsernameOrEmail(ctx, identifier)
	if err != nil {
		return err
	}
	if user == nil {
		return services.NewNotFound("That user could not be found.")
	}

	// Generate reset key
	key := rs.String(50)

	// Store reset key
	if err := s.tokenRepo.CreatePasswordResetKey(ctx, key, user.UsernameSafe); err != nil {
		return err
	}

	// Send email
	_, err = s.mail.SendPasswordReset(ctx, user.Email, key, s.config.App.BaseURL)
	return err
}

// ResetPassword completes a password reset.
func (s *Service) ResetPassword(ctx context.Context, key, newPassword string) error {
	// Get username from key
	usernameSafe, err := s.tokenRepo.GetPasswordResetUsername(ctx, key)
	if err != nil {
		return err
	}
	if usernameSafe == "" {
		return services.NewNotFound("That key could not be found. Perhaps it expired?")
	}

	// Validate new password
	if err := validation.ValidatePassword(newPassword); err != nil {
		return services.NewBadRequest(err.Error())
	}

	// Hash password
	hashedPassword, err := crypto.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update password
	if err := s.userRepo.UpdatePasswordByUsername(ctx, usernameSafe, hashedPassword); err != nil {
		return err
	}

	// Delete reset key
	if err := s.tokenRepo.DeletePasswordResetKey(ctx, key); err != nil {
		return err
	}

	// Get user ID for Redis notification
	user, _ := s.userRepo.FindByUsername(ctx, usernameSafe)
	if user != nil {
		s.PublishPasswordChange(ctx, user.ID)
	}

	return nil
}

// PublishPasswordChange publishes a password change event to Redis.
func (s *Service) PublishPasswordChange(ctx context.Context, userID int) {
	s.redis.Publish(ctx, "peppy:change_pass", fmt.Sprintf(`{"user_id": %d}`, userID))
}

// ValidateIdentityToken validates an identity token belongs to a user.
func (s *Service) ValidateIdentityToken(ctx context.Context, token string, userID int) (bool, error) {
	return s.tokenRepo.ValidateIdentityToken(ctx, token, userID)
}

// CheckMultiAccount checks for potential multi-accounts.
func (s *Service) CheckMultiAccount(ctx context.Context, ip, identityToken string) (string, string, error) {
	// Check by IP
	username, err := s.tokenRepo.GetUsernameByIP(ctx, ip)
	if err != nil {
		return "", "", err
	}
	if username != "" {
		return username, "IP", nil
	}

	// Check by identity token
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

// GetPasswordResetUsername gets the username associated with a password reset key.
func (s *Service) GetPasswordResetUsername(ctx context.Context, key string) (string, error) {
	return s.tokenRepo.GetPasswordResetUsername(ctx, key)
}

// Forbidden usernames list.
var forbiddenUsernames = map[string]struct{}{
	"whitecat": {}, "merami": {}, "ppy": {}, "peppy": {}, "varvallian": {},
	"spare": {}, "beasttroll": {}, "beasttrollmc": {}, "wubwubwolf": {},
	"whitew0lf": {}, "vaxei": {}, "alumetri": {}, "mathi": {}, "flyingtuna": {},
	"idke": {}, "fgsky": {}, "dxrkify": {}, "karthy": {}, "osu!": {},
	"freddie benson": {}, "micca": {}, "ryuk": {}, "azr8": {}, "toy": {},
	"fieryrage": {}, "firebat92": {}, "umbre": {}, "mouseeasy": {},
	"bartek22830": {}, "gashi": {}, "moeyandere": {}, "piggey": {},
	"angelism": {}, "cookiezi": {}, "nathan on osu": {}, "chocomint": {},
	"wakson": {}, "karuna": {}, "monko2k": {}, "koifishu": {}, "bananya": {},
	"hvick": {}, "hvick225": {}, "sotarks": {}, "rrtyui": {}, "armin": {},
	"a r m i n": {}, "rustbell": {}, "thelewa": {}, "happystick": {},
	"cptnxn": {}, "reimu-desu": {}, "bahamete": {}, "azer": {}, "axarious": {},
	"oxycodone": {}, "sayonara-bye": {}, "sapphireghost": {}, "adamqs": {},
	"_index": {}, "-gn": {}, "rafis": {},
}

func isForbiddenUsername(username string) bool {
	_, exists := forbiddenUsernames[strings.ToLower(username)]
	return exists
}

// GetUserPrivileges gets a user's privileges.
func (s *Service) GetUserPrivileges(ctx context.Context, userID int) (common.UserPrivileges, error) {
	return s.userRepo.GetPrivileges(ctx, userID)
}

// PublishClanUpdate publishes a clan update event to Redis.
func (s *Service) PublishClanUpdate(ctx context.Context, userID int) {
	s.redis.Publish(ctx, "rosu:clan_update", strconv.Itoa(userID))
}
