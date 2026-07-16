package payments

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/checkout/session"
	"github.com/stripe/stripe-go/v74/webhook"
)

type StripeProvider struct {
	secretKey     string
	webhookSecret string
	successURL    string
	cancelURL     string
}

func NewStripeProvider(secretKey, webhookSecret, baseURL string) *StripeProvider {
	return &StripeProvider{
		secretKey:     secretKey,
		webhookSecret: webhookSecret,
		successURL:    baseURL + "/donate?payment=success",
		cancelURL:     baseURL + "/donate?payment=cancel",
	}
}

func (p *StripeProvider) Name() string             { return "stripe" }
func (p *StripeProvider) BonusMultiplier() float64 { return 1.10 }

func (p *StripeProvider) InitiateCheckout(ctx context.Context, req CheckoutRequest) (string, error) {
	stripe.Key = p.secretKey
	amount := int64(req.PriceGBP * 100)
	params := &stripe.CheckoutSessionParams{
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(p.successURL),
		CancelURL:  stripe.String(p.cancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{{
			Quantity: stripe.Int64(1),
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String("gbp"),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(strconv.Itoa(req.Months) + " Month(s) RealistikOsu Supporter"),
				},
				UnitAmount: stripe.Int64(amount),
			},
		}},
	}
	params.AddMetadata("user_id", strconv.Itoa(req.UserID))
	params.AddMetadata("months", strconv.Itoa(req.Months))
	s, err := session.New(params)
	if err != nil {
		return "", err
	}
	return s.URL, nil
}

func (p *StripeProvider) ParseWebhook(r *http.Request) (*WebhookResult, error) {
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	event, err := webhook.ConstructEventWithOptions(payload, r.Header.Get("Stripe-Signature"), p.webhookSecret,
		webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true})
	if err != nil {
		return nil, err
	}
	if event.Type != "checkout.session.completed" {
		return &WebhookResult{Completed: false}, nil
	}
	var sess stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &sess); err != nil {
		return nil, err
	}
	userID, _ := strconv.Atoi(sess.Metadata["user_id"])
	months, _ := strconv.Atoi(sess.Metadata["months"])
	return &WebhookResult{
		UserID: userID, Months: months, OrderID: sess.ID,
		AmountGBP: float64(sess.AmountTotal) / 100, Completed: true,
	}, nil
}
