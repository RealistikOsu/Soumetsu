package repositories

import (
	"context"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
)

// StatsRepository handles user statistics data access.
type StatsRepository struct {
	db *mysql.DB
}

// NewStatsRepository creates a new stats repository.
func NewStatsRepository(db *mysql.DB) *StatsRepository {
	return &StatsRepository{db: db}
}

// InitializeUserStats creates the initial stats rows for a new user.
func (r *StatsRepository) InitializeUserStats(ctx context.Context, userID int64, username string) error {
	// Standard stats
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO users_stats(id, username, user_color, user_style,
			ranked_score_std, playcount_std, total_score_std,
			ranked_score_taiko, playcount_taiko, total_score_taiko,
			ranked_score_ctb, playcount_ctb, total_score_ctb,
			ranked_score_mania, playcount_mania, total_score_mania)
		VALUES (?, ?, 'black', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`, userID, username)
	if err != nil {
		return err
	}

	// Relax stats
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO rx_stats(id, username, user_color, user_style,
			ranked_score_std, playcount_std, total_score_std,
			ranked_score_taiko, playcount_taiko, total_score_taiko,
			ranked_score_ctb, playcount_ctb, total_score_ctb,
			ranked_score_mania, playcount_mania, total_score_mania)
		VALUES (?, ?, 'black', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`, userID, username)
	if err != nil {
		return err
	}

	// Autopilot stats
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO ap_stats(id, username, user_color, user_style,
			ranked_score_std, playcount_std, total_score_std,
			ranked_score_taiko, playcount_taiko, total_score_taiko,
			ranked_score_ctb, playcount_ctb, total_score_ctb,
			ranked_score_mania, playcount_mania, total_score_mania)
		VALUES (?, ?, 'black', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`, userID, username)
	return err
}

// SystemRepository handles system settings data access.
type SystemRepository struct {
	db *mysql.DB
}

// NewSystemRepository creates a new system repository.
func NewSystemRepository(db *mysql.DB) *SystemRepository {
	return &SystemRepository{db: db}
}

// RegistrationsEnabled checks if registrations are enabled.
func (r *SystemRepository) RegistrationsEnabled(ctx context.Context) (bool, error) {
	var enabled bool
	err := r.db.QueryRowContext(ctx, "SELECT value_int FROM system_settings WHERE name = 'registrations_enabled'").Scan(&enabled)
	if err != nil {
		return false, err
	}
	return enabled, nil
}

// DiscordRepository handles Discord OAuth data access.
type DiscordRepository struct {
	db *mysql.DB
}

// NewDiscordRepository creates a new Discord repository.
func NewDiscordRepository(db *mysql.DB) *DiscordRepository {
	return &DiscordRepository{db: db}
}

// IsLinked checks if a user has a linked Discord account.
func (r *DiscordRepository) IsLinked(ctx context.Context, userID int) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM discord_oauth WHERE user_id = ?", userID).Scan(&exists)
	if err != nil {
		return false, nil
	}
	return true, nil
}

// Link links a Discord account to a user.
func (r *DiscordRepository) Link(ctx context.Context, userID int, discordID string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO discord_oauth(id, discord_id, user_id)
		VALUES (NULL, ?, ?)`, discordID, userID)
	return err
}

// Unlink removes a Discord account link from a user.
func (r *DiscordRepository) Unlink(ctx context.Context, userID int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM discord_oauth WHERE user_id = ?", userID)
	return err
}

// ProfileBackgroundRepository handles profile background data access.
type ProfileBackgroundRepository struct {
	db *mysql.DB
}

// NewProfileBackgroundRepository creates a new profile background repository.
func NewProfileBackgroundRepository(db *mysql.DB) *ProfileBackgroundRepository {
	return &ProfileBackgroundRepository{db: db}
}

// SetBackground sets a user's profile background.
func (r *ProfileBackgroundRepository) SetBackground(ctx context.Context, userID int, bgType int, value string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO profile_backgrounds(uid, time, type, value)
		VALUES (?, UNIX_TIMESTAMP(), ?, ?)
		ON DUPLICATE KEY UPDATE time = UNIX_TIMESTAMP(), type = ?, value = ?`,
		userID, bgType, value, bgType, value)
	return err
}

// GetBackground gets a user's profile background.
func (r *ProfileBackgroundRepository) GetBackground(ctx context.Context, userID int) (int, string, error) {
	var bgType int
	var value string
	err := r.db.QueryRowContext(ctx, "SELECT type, value FROM profile_backgrounds WHERE uid = ?", userID).Scan(&bgType, &value)
	return bgType, value, err
}
