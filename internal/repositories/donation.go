package repositories

import (
	"context"
	"database/sql"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
)

type DonationRepository struct {
	db *mysql.DB
}

func NewDonationRepository(db *mysql.DB) *DonationRepository {
	return &DonationRepository{db: db}
}

// UserIDByUsername resolves a username to a user id in the clean rosu schema.
// Returns (0, nil) if not found.
func (r *DonationRepository) UserIDByUsername(ctx context.Context, username string) (int, error) {
	var id int
	err := r.db.GetContext(ctx, &id,
		"SELECT id FROM rosu.users WHERE username_safe = ? LIMIT 1",
		SafeUsername(username))
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return id, err
}

// InsertDonationOnce records the donation; returns false if this (provider,
// order_id) already exists (idempotent).
func (r *DonationRepository) InsertDonationOnce(ctx context.Context, userID int, provider, orderID string, months int, amount float64, currency string) (bool, error) {
	res, err := r.db.ExecContext(ctx,
		`INSERT IGNORE INTO rosu.donations (user_id, provider, order_id, months, amount, currency)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		userID, provider, orderID, months, amount, currency)
	if err != nil {
		return false, err
	}
	n, _ := res.RowsAffected()
	return n == 1, nil
}

// ApplyDonorTime extends donor_end by bonusSeconds and sets the v2 DONOR bit (2).
func (r *DonationRepository) ApplyDonorTime(ctx context.Context, userID int, bonusSeconds int64) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE rosu.users
		 SET donor_end = GREATEST(COALESCE(donor_end, NOW()), NOW()) + INTERVAL ? SECOND,
		     privileges = privileges | 2
		 WHERE id = ?`,
		bonusSeconds, userID)
	return err
}
