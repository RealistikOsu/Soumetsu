package repositories

import (
	"context"
	"database/sql"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
)

type TokenRepository struct {
	db *mysql.DB
}

func NewTokenRepository(db *mysql.DB) *TokenRepository {
	return &TokenRepository{db: db}
}

func (r *TokenRepository) CreateAPIToken(ctx context.Context, userID int, description, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO tokens(user_id, privileges, description, token, private, last_updated)
		VALUES (?, 0, ?, ?, 1, NOW())`, userID, description, tokenHash)
	return err
}

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

func (r *TokenRepository) GetIdentityToken(ctx context.Context, userID int) (string, error) {
	var token string
	err := r.db.QueryRowContext(ctx, "SELECT token FROM identity_tokens WHERE user_id = ? LIMIT 1", userID).Scan(&token)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return token, err
}

func (r *TokenRepository) CreateIdentityToken(ctx context.Context, userID int, token string) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO identity_tokens(user_id, token) VALUES (?, ?)", userID, token)
	return err
}

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

func (r *TokenRepository) ValidateIdentityToken(ctx context.Context, token string, userID int) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM identity_tokens WHERE token = ? AND user_id = ?", token, userID).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *TokenRepository) GetUsernameByIdentityToken(ctx context.Context, token string) (string, error) {
	var username string
	err := r.db.QueryRowContext(ctx, `
		SELECT u.username FROM identity_tokens i
		INNER JOIN users u ON u.id = i.user_id
		WHERE i.token = ?`, token).Scan(&username)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return username, err
}

func (r *TokenRepository) CreatePasswordResetKey(ctx context.Context, key, usernameSafe string) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO password_recovery(token, username) VALUES (?, ?)", key, usernameSafe)
	return err
}

func (r *TokenRepository) GetPasswordResetUsername(ctx context.Context, key string) (string, error) {
	var username string
	err := r.db.QueryRowContext(ctx, "SELECT username FROM password_recovery WHERE token = ? LIMIT 1", key).Scan(&username)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return username, err
}

func (r *TokenRepository) DeletePasswordResetKey(ctx context.Context, key string) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM password_recovery WHERE token = ? LIMIT 1", key)
	return err
}

func (r *TokenRepository) LogIP(ctx context.Context, userID int, ip string) error {
	_, err := r.db.ExecContext(ctx,
		"INSERT INTO user_logins(user_id, ip) VALUES (?, INET6_ATON(?))", userID, ip)
	return err
}

func (r *TokenRepository) GetUsernameByIP(ctx context.Context, ip string) (string, error) {
	var username string
	err := r.db.QueryRowContext(ctx, `
		SELECT u.username FROM user_logins i
		INNER JOIN users u ON u.id = i.user_id
		WHERE i.ip = INET6_ATON(?) ORDER BY i.id DESC LIMIT 1`, ip).Scan(&username)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return username, err
}
