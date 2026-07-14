package payments

import (
	"context"
	"net/http"
)

// CheckoutRequest is the input to start a donation checkout.
type CheckoutRequest struct {
	UserID   int     // recipient (gift-capable), resolved+validated at handler
	Username string  // recipient username (for provider display/metadata)
	Months   int
	PriceGBP float64 // from CalculateDonorPrice
}

// WebhookResult is the verified outcome extracted from a provider webhook.
type WebhookResult struct {
	UserID    int
	Months    int
	OrderID   string
	AmountGBP float64
	Completed bool // true when payment is final and should be fulfilled
}

// PaymentProvider is one donation backend (freekassa/stripe/paypal).
type PaymentProvider interface {
	Name() string
	BonusMultiplier() float64 // stripe 1.10; freekassa/paypal 1.00
	InitiateCheckout(ctx context.Context, req CheckoutRequest) (redirectURL string, err error)
	ParseWebhook(r *http.Request) (*WebhookResult, error) // MUST verify authenticity
}
