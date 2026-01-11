package repositories

import (
	"context"
	"database/sql"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
)

// TokenRepository handles token data access.
type TokenRepository struct {
	db *mysql.DB
}

// NewTokenRepository creates a new token repository.
func NewTokenRepository(db *mysql.DB) *TokenRepository {
	return &TokenRepository{db: db}
}

// CreateAPIToken creates a new API token for a user.
func (r *TokenRepository) CreateAPIToken(ctx context.Context, userID int, description, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO tokens(user, privileges, description, token, private)
		VALUES (?, '0', ?, ?, '1')`, userID, description, tokenHash)
	return err
}

// TokenExists checks if a token hash exists.
func (r *TokenRepository) TokenExists(ctx context.Context, tokenHash string) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM tokens WHERE token = ?", tokenHash).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// GetIdentityToken gets a user's identity token.
func (r *TokenRepository) GetIdentityToken(ctx context.Context, userID int) (string, error) {
	var token string
	err := r.db.QueryRowContext(ctx, "SELECT token FROM identity_tokens WHERE userid = ? LIMIT 1", userID).Scan(&token)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return token, err
}

// CreateIdentityToken creates a new identity token.
func (r *TokenRepository) CreateIdentityToken(ctx context.Context, userID int, token string) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO identity_tokens(userid, token) VALUES (?, ?)", userID, token)
	return err
}

// IdentityTokenExists checks if an identity token exists.
func (r *TokenRepository) IdentityTokenExists(ctx context.Context, token string) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM identity_tokens WHERE token = ? LIMIT 1", token).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// ValidateIdentityToken validates that a token belongs to a user.
func (r *TokenRepository) ValidateIdentityToken(ctx context.Context, token string, userID int) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM identity_tokens WHERE token = ? AND userid = ?", token, userID).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// GetUsernameByIdentityToken gets a username from an identity token.
func (r *TokenRepository) GetUsernameByIdentityToken(ctx context.Context, token string) (string, error) {
	var username string
	err := r.db.QueryRowContext(ctx, `
		SELECT u.username FROM identity_tokens i
		INNER JOIN users u ON u.id = i.userid
		WHERE i.token = ?`, token).Scan(&username)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return username, err
}

// CreatePasswordResetKey creates a password reset key.
func (r *TokenRepository) CreatePasswordResetKey(ctx context.Context, key, usernameSafe string) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO password_recovery(k, u) VALUES (?, ?)", key, usernameSafe)
	return err
}

// GetPasswordResetUsername gets the username from a password reset key.
func (r *TokenRepository) GetPasswordResetUsername(ctx context.Context, key string) (string, error) {
	var username string
	err := r.db.QueryRowContext(ctx, "SELECT u FROM password_recovery WHERE k = ? LIMIT 1", key).Scan(&username)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return username, err
}

// DeletePasswordResetKey deletes a password reset key.
func (r *TokenRepository) DeletePasswordResetKey(ctx context.Context, key string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM password_recovery WHERE k = ? LIMIT 1", key)
	return err
}

// LogIP logs a user's IP address.
func (r *TokenRepository) LogIP(ctx context.Context, userID int, ip string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO ip_user (userid, ip, occurencies) VALUES (?, ?, '1')
		ON DUPLICATE KEY UPDATE occurencies = occurencies + 1`, userID, ip)
	return err
}

// GetUsernameByIP gets a username that has used a specific IP.
func (r *TokenRepository) GetUsernameByIP(ctx context.Context, ip string) (string, error) {
	var username string
	err := r.db.QueryRowContext(ctx, `
		SELECT u.username FROM ip_user i
		INNER JOIN users u ON u.id = i.userid
		WHERE i.ip = ?`, ip).Scan(&username)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return username, err
}
