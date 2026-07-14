package payments

import (
	"context"
	"log/slog"
)

// DonorStore is the persistence fulfillment needs (satisfied by
// *repositories.DonationRepository).
type DonorStore interface {
	InsertDonationOnce(ctx context.Context, userID int, provider, orderID string, months int, amount float64, currency string) (bool, error)
	ApplyDonorTime(ctx context.Context, userID int, bonusSeconds int64) error
}

type Service struct {
	store    DonorStore
	currency string
}

func NewService(store DonorStore, currency string) *Service {
	return &Service{store: store, currency: currency}
}

// Fulfill records the donation and extends donor time, exactly once per
// (provider, order_id). No-op if not Completed or already recorded.
func (s *Service) Fulfill(ctx context.Context, p PaymentProvider, res WebhookResult) error {
	if !res.Completed || res.UserID == 0 || res.Months <= 0 {
		return nil
	}
	fresh, err := s.store.InsertDonationOnce(ctx, res.UserID, p.Name(), res.OrderID, res.Months, res.AmountGBP, s.currency)
	if err != nil {
		return err
	}
	if !fresh {
		slog.Info("donation already processed", "provider", p.Name(), "order", res.OrderID)
		return nil
	}
	bonusSeconds := int64(float64(res.Months) * 30 * 86400 * p.BonusMultiplier())
	if err := s.store.ApplyDonorTime(ctx, res.UserID, bonusSeconds); err != nil {
		return err
	}
	slog.Info("donation fulfilled", "provider", p.Name(), "user", res.UserID, "months", res.Months, "order", res.OrderID)
	return nil
}
