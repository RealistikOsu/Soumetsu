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
	// 8 rows: vn std/taiko/ctb/mania (0-3), rx std/taiko/ctb (4-6), ap std (7)
	for _, mode := range []int{0, 1, 2, 3, 4, 5, 6, 7} {
		if _, err := r.db.ExecContext(ctx,
			"INSERT INTO user_stats(user_id, mode) VALUES (?, ?)", userID, mode); err != nil {
			return err
		}
	}
	_, err := r.db.ExecContext(ctx, "INSERT INTO user_settings(user_id) VALUES (?)", userID)
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
		INSERT INTO discord_oauth(discord_id, user_id, discord_username, discord_avatar)
		VALUES (?, ?, '', '')`, discordID, userID)
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
		INSERT INTO profile_backgrounds(user_id, set_at, type, value)
		VALUES (?, NOW(), ?, ?)
		ON DUPLICATE KEY UPDATE set_at = NOW(), type = ?, value = ?`,
		userID, bgType, value, bgType, value)
	return err
}

func (r *ProfileBackgroundRepository) GetBackground(ctx context.Context, userID int) (int, string, error) {
	var bgType int
	var value string
	err := r.db.QueryRowContext(ctx, "SELECT type, value FROM profile_backgrounds WHERE user_id = ?", userID).Scan(&bgType, &value)
	return bgType, value, err
}
