package repositories

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	"github.com/RealistikOsu/soumetsu/internal/models"
)

type UserRepository struct {
	db *mysql.DB
}

func NewUserRepository(db *mysql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(ctx context.Context, id int) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, `
		SELECT id, username, username_safe, email, password_bcrypt,
		       privileges, public, country, register_time, latest_activity, coins
		FROM users WHERE id = ? LIMIT 1`, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByUsername(ctx context.Context, username string) (*models.User, error) {
	safe := SafeUsername(username)
	var user models.User
	err := r.db.GetContext(ctx, &user, `
		SELECT id, username, username_safe, email, password_bcrypt,
		       privileges, public, country, register_time, latest_activity, coins
		FROM users WHERE username_safe = ? LIMIT 1`, safe)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.GetContext(ctx, &user, `
		SELECT id, username, username_safe, email, password_bcrypt,
		       privileges, public, country, register_time, latest_activity, coins
		FROM users WHERE email = ? LIMIT 1`, email)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByUsernameOrEmail(ctx context.Context, identifier string) (*models.User, error) {
	if strings.Contains(identifier, "@") {
		return r.FindByEmail(ctx, identifier)
	}
	return r.FindByUsername(ctx, identifier)
}

type UserForLogin struct {
	ID         int                   `db:"id"`
	Username   string                `db:"username"`
	Password   string                `db:"password_bcrypt"`
	Country    string                `db:"country"`
	Privileges models.UserPrivileges `db:"privileges"`
	Public     bool                  `db:"public"`
}

func (r *UserRepository) FindForLogin(ctx context.Context, identifier string) (*UserForLogin, error) {
	param := "username_safe"
	value := identifier
	if strings.Contains(identifier, "@") {
		param = "email"
	} else {
		value = SafeUsername(identifier)
	}

	var user UserForLogin
	query := `SELECT id, password_bcrypt, username, country, privileges, public
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

func (r *UserRepository) Create(ctx context.Context, username, email, password string, privileges models.UserPrivileges) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO users(username, username_safe, password_bcrypt, email, privileges)
		VALUES (?, ?, ?, ?, ?)`,
		username, SafeUsername(username), password, email, privileges)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r *UserRepository) UpdatePassword(ctx context.Context, id int, password string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET password_bcrypt = ? WHERE id = ?", password, id)
	return err
}

func (r *UserRepository) UpdatePasswordByUsername(ctx context.Context, usernameSafe, password string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET password_bcrypt = ? WHERE username_safe = ?", password, usernameSafe)
	return err
}

func (r *UserRepository) UpdateCountry(ctx context.Context, id int, country string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET country = ? WHERE id = ?", country, id)
	return err
}

func (r *UserRepository) UpdateLatestActivity(ctx context.Context, id int, t time.Time) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET latest_activity = ? WHERE id = ?", t, id)
	return err
}

func (r *UserRepository) UpdateEmail(ctx context.Context, id int, email string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET email = ? WHERE id = ?", email, id)
	return err
}

func (r *UserRepository) UpdateUsername(ctx context.Context, id int, username string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET username = ?, username_safe = ? WHERE id = ?",
		username, SafeUsername(username), id)
	return err
}

func (r *UserRepository) GetPrivileges(ctx context.Context, id int) (models.UserPrivileges, error) {
	var priv int64
	err := r.db.QueryRowContext(ctx, "SELECT privileges FROM users WHERE id = ?", id).Scan(&priv)
	if err != nil {
		return 0, err
	}
	return models.UserPrivileges(priv), nil
}

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

func (r *UserRepository) RecordUsernameChange(ctx context.Context, userID int, oldUsername, newUsername string, changedAt int64) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO user_name_history(user_id, username, replaced_at)
		VALUES (?, ?, ?)`, userID, oldUsername, changedAt)
	return err
}

func (r *UserRepository) GetClanMembership(ctx context.Context, userID int) (*models.ClanMembership, error) {
	var membership models.ClanMembership
	err := r.db.GetContext(ctx, &membership,
		"SELECT id AS user_id, clan_id, clan_perms FROM users WHERE id = ? AND clan_id IS NOT NULL", userID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &membership, nil
}

func (r *UserRepository) GetUserpage(ctx context.Context, userID int) (string, error) {
	var content sql.NullString
	err := r.db.QueryRowContext(ctx, "SELECT userpage_content FROM user_settings WHERE user_id = ?", userID).Scan(&content)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return content.String, err
}

func (r *UserRepository) UpdateUserpage(ctx context.Context, userID int, content string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE user_settings SET userpage_content = ? WHERE user_id = ?", content, userID)
	return err
}

func (r *UserRepository) GetBadgeMembers(ctx context.Context, badgeID int) ([]models.User, error) {
	var users []models.User
	err := r.db.SelectContext(ctx, &users, `
		SELECT u.id, u.username, u.privileges, u.country, u.register_time, u.latest_activity
		FROM users u
		JOIN user_badges ub ON u.id = ub.user_id
		WHERE ub.badge_id = ?
		ORDER BY u.id ASC`, badgeID)
	if err != nil {
		return nil, err
	}
	return users, nil
}

func SafeUsername(username string) string {
	return strings.ReplaceAll(strings.ToLower(strings.TrimSpace(username)), " ", "_")
}
