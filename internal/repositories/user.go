package repositories

import (
	"context"
	"database/sql"
	"strings"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	"github.com/RealistikOsu/soumetsu/internal/models"
)

// UserRepository handles user data access.
type UserRepository struct {
	db *mysql.DB
}

// NewUserRepository creates a new user repository.
func NewUserRepository(db *mysql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// FindByID finds a user by their ID.
func (r *UserRepository) FindByID(ctx context.Context, id int) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, `
		SELECT id, username, username_safe, email, password_md5, password_version,
		       privileges, flags, country, register_datetime, latest_activity, coins
		FROM users WHERE id = ? LIMIT 1`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername finds a user by their username (safe format).
func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	safe := SafeUsername(username)
	var user models.User
	err := r.db.GetContext(ctx, &user, `
		SELECT id, username, username_safe, email, password_md5, password_version,
		       privileges, flags, country, register_datetime, latest_activity, coins
		FROM users WHERE username_safe = ? LIMIT 1`, safe)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByEmail finds a user by their email.
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, `
		SELECT id, username, username_safe, email, password_md5, password_version,
		       privileges, flags, country, register_datetime, latest_activity, coins
		FROM users WHERE email = ? LIMIT 1`, email)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsernameOrEmail finds a user by username or email.
func (r *UserRepository) FindByUsernameOrEmail(ctx context.Context, identifier string) (*models.User, error) {
	if strings.Contains(identifier, "@") {
		return r.FindByEmail(ctx, identifier)
	}
	return r.FindByUsername(ctx, identifier)
}

// UserForLogin contains the data needed for login verification.
type UserForLogin struct {
	ID              int                   `db:"id"`
	Username        string                `db:"username"`
	Password        string                `db:"password_md5"`
	PasswordVersion int                   `db:"password_version"`
	Country         string                `db:"country"`
	Privileges      common.UserPrivileges `db:"privileges"`
	Flags           uint64                `db:"flags"`
}

// FindForLogin finds a user's login data by username or email.
func (r *UserRepository) FindForLogin(ctx context.Context, identifier string) (*UserForLogin, error) {
	param := "username_safe"
	value := identifier
	if strings.Contains(identifier, "@") {
		param = "email"
	} else {
		value = SafeUsername(identifier)
	}

	var user UserForLogin
	query := `SELECT id, password_md5, username, password_version, country, privileges, flags
		FROM users WHERE ` + param + ` = ? LIMIT 1`
	err := r.db.GetContext(ctx, &user, query, strings.TrimSpace(value))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// Create creates a new user.
func (r *UserRepository) Create(ctx context.Context, username, email, password, apiKey string, privileges common.UserPrivileges, registerTime int64) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO users(username, username_safe, password_md5, salt, email, register_datetime, privileges, password_version, api_key)
		VALUES (?, ?, ?, '', ?, ?, ?, 2, ?)`,
		username, SafeUsername(username), password, email, registerTime, privileges, apiKey)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// UpdatePassword updates a user's password.
func (r *UserRepository) UpdatePassword(ctx context.Context, id int, password string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET password_md5 = ?, password_version = 2 WHERE id = ?", password, id)
	return err
}

// UpdatePasswordByUsername updates a user's password by username (safe format).
func (r *UserRepository) UpdatePasswordByUsername(ctx context.Context, usernameSafe, password string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET password_md5 = ?, salt = '', password_version = '2' WHERE username_safe = ?", password, usernameSafe)
	return err
}

// UpdateCountry updates a user's country.
func (r *UserRepository) UpdateCountry(ctx context.Context, id int, country string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET country = ? WHERE id = ?", country, id)
	return err
}

// UpdateEmail updates a user's email.
func (r *UserRepository) UpdateEmail(ctx context.Context, id int, email string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET email = ? WHERE id = ?", email, id)
	return err
}

// UpdateUsername updates a user's username.
func (r *UserRepository) UpdateUsername(ctx context.Context, id int, username string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET username = ?, username_safe = ? WHERE id = ?",
		username, SafeUsername(username), id)
	return err
}

// ClearFlags clears specific flags from a user.
func (r *UserRepository) ClearFlags(ctx context.Context, id int, flags uint64) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET flags = flags & ~? WHERE id = ? LIMIT 1", flags, id)
	return err
}

// GetPrivileges gets a user's privileges.
func (r *UserRepository) GetPrivileges(ctx context.Context, id int) (common.UserPrivileges, error) {
	var priv int64
	err := r.db.QueryRowContext(ctx, "SELECT privileges FROM users WHERE id = ?", id).Scan(&priv)
	if err != nil {
		return 0, err
	}
	return common.UserPrivileges(priv), nil
}

// UsernameExists checks if a username already exists.
func (r *UserRepository) UsernameExists(ctx context.Context, username string) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM users WHERE username_safe = ?", SafeUsername(username)).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// EmailExists checks if an email already exists.
func (r *UserRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM users WHERE email = ?", email).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// UsernameInHistory checks if a username is in the history table.
func (r *UserRepository) UsernameInHistory(ctx context.Context, username string) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM user_name_history WHERE username LIKE ? LIMIT 1", username).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// RecordUsernameChange records a username change in history.
func (r *UserRepository) RecordUsernameChange(ctx context.Context, userID int, oldUsername, newUsername string, changedAt int64) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO user_name_history(user_id, username, changed_datetime)
		VALUES (?, ?, ?)`, userID, oldUsername, changedAt)
	return err
}

// GetClanMembership gets a user's clan membership.
func (r *UserRepository) GetClanMembership(ctx context.Context, userID int) (*models.ClanMembership, error) {
	var membership models.ClanMembership
	err := r.db.GetContext(ctx, &membership, "SELECT user, clan, perms FROM user_clans WHERE user = ?", userID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &membership, nil
}

// SafeUsername converts a username to its safe format.
func SafeUsername(username string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(username)), " ", "_")
}
