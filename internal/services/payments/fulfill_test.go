package payments

import (
	"context"
	"net/http"
	"testing"
)

type fakeStore struct {
	inserted bool
	seconds  int64
	applied  bool
}

func (f *fakeStore) InsertDonationOnce(ctx context.Context, userID int, provider, orderID string, months int, amount float64, currency string) (bool, error) {
	if f.inserted {
		return false, nil
	}
	f.inserted = true
	return true, nil
}
func (f *fakeStore) ApplyDonorTime(ctx context.Context, userID int, bonusSeconds int64) error {
	f.applied = true
	f.seconds = bonusSeconds
	return nil
}

type stubProvider struct {
	name string
	mult float64
}

func (s stubProvider) Name() string             { return s.name }
func (s stubProvider) BonusMultiplier() float64 { return s.mult }
func (s stubProvider) InitiateCheckout(ctx context.Context, r CheckoutRequest) (string, error) {
	return "", nil
}
func (s stubProvider) ParseWebhook(*http.Request) (*WebhookResult, error) { return nil, nil }

func TestFulfill_StripeBonus(t *testing.T) {
	f := &fakeStore{}
	svc := NewService(f, "GBP")
	err := svc.Fulfill(context.Background(), stubProvider{name: "stripe", mult: 1.10},
		WebhookResult{UserID: 5, Months: 2, OrderID: "o1", AmountGBP: 10, Completed: true})
	if err != nil {
		t.Fatal(err)
	}
	if !f.applied {
		t.Fatal("donor time not applied")
	}
	if f.seconds != int64(2*30*86400*1.10) {
		t.Fatalf("bonus seconds = %d", f.seconds)
	}
}

func TestFulfill_Dedup(t *testing.T) {
	f := &fakeStore{inserted: true}
	svc := NewService(f, "GBP")
	err := svc.Fulfill(context.Background(), stubProvider{name: "stripe", mult: 1.10},
		WebhookResult{UserID: 5, Months: 2, OrderID: "o1", Completed: true})
	if err != nil {
		t.Fatal(err)
	}
	if f.applied {
		t.Fatal("donor time applied on duplicate — should be skipped")
	}
}
