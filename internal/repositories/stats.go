package repositories

import (
	"context"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
)

type StatsRepository struct {
	db *mysql.DB
}

func NewStatsRepository(db *mysql.DB) *StatsRepository {
	return &StatsRepository{db: db}
}

func (r *StatsRepository) InitializeUserStats(ctx context.Context, userID int64, username string) error {
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

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO ap_stats(id, username, user_color, user_style,
			ranked_score_std, playcount_std, total_score_std,
			ranked_score_taiko, playcount_taiko, total_score_taiko,
			ranked_score_ctb, playcount_ctb, total_score_ctb,
			ranked_score_mania, playcount_mania, total_score_mania)
		VALUES (?, ?, 'black', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`, userID, username)
	return err
}

type SystemRepository struct {
	db *mysql.DB
}

func NewSystemRepository(db *mysql.DB) *SystemRepository {
	return &SystemRepository{db: db}
}

func (r *SystemRepository) RegistrationsEnabled(ctx context.Context) (bool, error) {
	var enabled bool
	err := r.db.QueryRowContext(ctx, "SELECT value_int FROM system_settings WHERE name = 'registrations_enabled'").Scan(&enabled)
	if err != nil {
		return false, err
	}
	return enabled, nil
}

type DiscordRepository struct {
	db *mysql.DB
}

func NewDiscordRepository(db *mysql.DB) *DiscordRepository {
	return &DiscordRepository{db: db}
}

func (r *DiscordRepository) IsLinked(ctx context.Context, userID int) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM discord_oauth WHERE user_id = ?", userID).Scan(&exists)
	if err != nil {
		return false, nil
	}
	return true, nil
}

func (r *DiscordRepository) Link(ctx context.Context, userID int, discordID string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO discord_oauth(id, discord_id, user_id)
		VALUES (NULL, ?, ?)`, discordID, userID)
	return err
}

func (r *DiscordRepository) Unlink(ctx context.Context, userID int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM discord_oauth WHERE user_id = ?", userID)
	return err
}

type ProfileBackgroundRepository struct {
	db *mysql.DB
}

func NewProfileBackgroundRepository(db *mysql.DB) *ProfileBackgroundRepository {
	return &ProfileBackgroundRepository{db: db}
}

func (r *ProfileBackgroundRepository) SetBackground(ctx context.Context, userID int, bgType int, value string) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO profile_backgrounds(uid, time, type, value)
		VALUES (?, UNIX_TIMESTAMP(), ?, ?)
		ON DUPLICATE KEY UPDATE time = UNIX_TIMESTAMP(), type = ?, value = ?`,
		userID, bgType, value, bgType, value)
	return err
}

func (r *ProfileBackgroundRepository) GetBackground(ctx context.Context, userID int) (int, string, error) {
	var bgType int
	var value string
	err := r.db.QueryRowContext(ctx, "SELECT type, value FROM profile_backgrounds WHERE uid = ?", userID).Scan(&bgType, &value)
	return bgType, value, err
}
