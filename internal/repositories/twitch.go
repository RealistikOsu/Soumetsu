package repositories

import (
	"context"
	"database/sql"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
)

// TwitchLink is a linked Twitch channel plus the streamer's request settings.
//
// The schema lives in the rosu-twitch repository (migrations/0001_twitch_tables.up.sql);
// this is the read/write side the website needs.
type TwitchLink struct {
	TwitchID       int64
	TwitchUsername string
	OsuUserID      int
	CreatedAt      int64

	Settings TwitchSettings
}

// TwitchSettings are the per-streamer request rules honoured by the bot.
type TwitchSettings struct {
	Enabled    bool
	Echo       bool
	SubOnly    bool
	PointsOnly bool
	Cooldown   int
	StarMin    float64
	StarMax    float64
}

// DefaultTwitchSettings matches the column defaults in twitch_settings, so a link
// with no settings row behaves identically to one with a freshly inserted row.
func DefaultTwitchSettings() TwitchSettings {
	return TwitchSettings{
		Enabled:    true,
		Echo:       true,
		SubOnly:    false,
		PointsOnly: false,
		Cooldown:   30,
		StarMin:    0,
		StarMax:    -1,
	}
}

type TwitchRepository struct {
	db *mysql.DB
}

func NewTwitchRepository(db *mysql.DB) *TwitchRepository {
	return &TwitchRepository{db: db}
}

// GetByUserID returns the link for an osu! account, or nil when unlinked.
func (r *TwitchRepository) GetByUserID(ctx context.Context, userID int) (*TwitchLink, error) {
	link := &TwitchLink{Settings: DefaultTwitchSettings()}

	// Settings are LEFT JOINed and read into nullable holders so a link that
	// predates its settings row still resolves, falling back to the defaults.
	var (
		enabled, echo, subOnly, pointsOnly sql.NullBool
		cooldown                           sql.NullInt64
		starMin, starMax                   sql.NullFloat64
	)

	err := r.db.QueryRowContext(ctx, `
		SELECT  l.twitch_id,
		        l.twitch_username,
		        l.osu_user_id,
		        l.created_at,
		        s.enabled,
		        s.echo,
		        s.sub_only,
		        s.points_only,
		        s.cooldown,
		        s.sr_min,
		        s.sr_max
		FROM       twitch_links    l
		LEFT JOIN  twitch_settings s ON s.twitch_id = l.twitch_id
		WHERE l.osu_user_id = ?
		LIMIT 1`, userID,
	).Scan(
		&link.TwitchID,
		&link.TwitchUsername,
		&link.OsuUserID,
		&link.CreatedAt,
		&enabled,
		&echo,
		&subOnly,
		&pointsOnly,
		&cooldown,
		&starMin,
		&starMax,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if enabled.Valid {
		link.Settings.Enabled = enabled.Bool
	}
	if echo.Valid {
		link.Settings.Echo = echo.Bool
	}
	if subOnly.Valid {
		link.Settings.SubOnly = subOnly.Bool
	}
	if pointsOnly.Valid {
		link.Settings.PointsOnly = pointsOnly.Bool
	}
	if cooldown.Valid {
		link.Settings.Cooldown = int(cooldown.Int64)
	}
	if starMin.Valid {
		link.Settings.StarMin = starMin.Float64
	}
	if starMax.Valid {
		link.Settings.StarMax = starMax.Float64
	}

	return link, nil
}

// LinkedToOtherUser reports whether a Twitch account is already claimed by a
// different osu! account. twitch_links has unique keys on both sides, so this
// exists purely to turn a would-be constraint violation into a clear message.
func (r *TwitchRepository) LinkedToOtherUser(ctx context.Context, twitchID int64, userID int) (bool, error) {
	var owner int
	err := r.db.QueryRowContext(ctx,
		"SELECT osu_user_id FROM twitch_links WHERE twitch_id = ? LIMIT 1", twitchID).Scan(&owner)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return owner != userID, nil
}

// Link creates or replaces the link for an osu! account and ensures a settings
// row exists for it.
func (r *TwitchRepository) Link(ctx context.Context, userID int, twitchID int64, twitchUsername string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Relinking to a different channel must not leave the previous row behind:
	// the unique key on osu_user_id would reject the insert.
	if _, err := tx.ExecContext(ctx,
		"DELETE FROM twitch_links WHERE osu_user_id = ?", userID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO twitch_links (twitch_id, twitch_username, osu_user_id, created_at)
		VALUES (?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			twitch_username = VALUES(twitch_username),
			osu_user_id     = VALUES(osu_user_id)`,
		twitchID, twitchUsername, userID, time.Now().Unix()); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT IGNORE INTO twitch_settings (twitch_id) VALUES (?)`, twitchID); err != nil {
		return err
	}

	return tx.Commit()
}

// Unlink removes the link. twitch_settings and twitch_excluded_users cascade.
func (r *TwitchRepository) Unlink(ctx context.Context, userID int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM twitch_links WHERE osu_user_id = ?", userID)
	return err
}

// UpdateSettings writes the streamer's request rules.
func (r *TwitchRepository) UpdateSettings(ctx context.Context, twitchID int64, s TwitchSettings) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO twitch_settings
			(twitch_id, enabled, echo, sub_only, points_only, cooldown, sr_min, sr_max)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			enabled     = VALUES(enabled),
			echo        = VALUES(echo),
			sub_only    = VALUES(sub_only),
			points_only = VALUES(points_only),
			cooldown    = VALUES(cooldown),
			sr_min      = VALUES(sr_min),
			sr_max      = VALUES(sr_max)`,
		twitchID, s.Enabled, s.Echo, s.SubOnly, s.PointsOnly, s.Cooldown, s.StarMin, s.StarMax)
	return err
}

// GetExcludedUsers returns the Twitch usernames barred from requesting.
func (r *TwitchRepository) GetExcludedUsers(ctx context.Context, twitchID int64) ([]string, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT excluded_username FROM twitch_excluded_users WHERE twitch_id = ? ORDER BY excluded_username",
		twitchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		users = append(users, name)
	}
	return users, rows.Err()
}

// ReplaceExcludedUsers swaps the exclusion list wholesale, which is how the
// settings form submits it.
func (r *TwitchRepository) ReplaceExcludedUsers(ctx context.Context, twitchID int64, usernames []string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx,
		"DELETE FROM twitch_excluded_users WHERE twitch_id = ?", twitchID); err != nil {
		return err
	}

	for _, name := range usernames {
		if _, err := tx.ExecContext(ctx, `
			INSERT IGNORE INTO twitch_excluded_users (twitch_id, excluded_username)
			VALUES (?, ?)`, twitchID, name); err != nil {
			return err
		}
	}

	return tx.Commit()
}
