package payments

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/plutov/paypal/v4"
)

// PayPalProvider integrates with PayPal Checkout Orders v2.
type PayPalProvider struct {
	clientID  string
	secret    string
	webhookID string
	baseURL   string
	apiBase   string // paypal.APIBaseSandBox / paypal.APIBaseLive
}

// NewPayPalProvider constructs a PayPalProvider. Set live=true to hit the
// production PayPal API instead of the sandbox.
func NewPayPalProvider(clientID, secret, webhookID, siteBaseURL string, live bool) *PayPalProvider {
	apiBase := paypal.APIBaseSandBox
	if live {
		apiBase = paypal.APIBaseLive
	}
	return &PayPalProvider{
		clientID:  clientID,
		secret:    secret,
		webhookID: webhookID,
		baseURL:   siteBaseURL,
		apiBase:   apiBase,
	}
}

func (p *PayPalProvider) Name() string             { return "paypal" }
func (p *PayPalProvider) BonusMultiplier() float64 { return 1.00 }

// client builds a paypal.Client and fetches an OAuth2 access token for it.
func (p *PayPalProvider) client(ctx context.Context) (*paypal.Client, error) {
	c, err := paypal.NewClient(p.clientID, p.secret, p.apiBase)
	if err != nil {
		return nil, err
	}
	if _, err := c.GetAccessToken(ctx); err != nil {
		return nil, err
	}
	return c, nil
}

func (p *PayPalProvider) InitiateCheckout(ctx context.Context, req CheckoutRequest) (string, error) {
	c, err := p.client(ctx)
	if err != nil {
		return "", err
	}

	unit := paypal.PurchaseUnitRequest{
		CustomID: fmt.Sprintf("%d:%d", req.UserID, req.Months),
		Amount: &paypal.PurchaseUnitAmount{
			Currency: "GBP",
			Value:    fmt.Sprintf("%.2f", req.PriceGBP),
		},
	}

	appCtx := &paypal.ApplicationContext{
		ReturnURL: p.baseURL + "/donate?payment=success",
		CancelURL: p.baseURL + "/donate?payment=cancel",
	}

	order, err := c.CreateOrder(ctx, paypal.OrderIntentCapture, []paypal.PurchaseUnitRequest{unit}, nil, appCtx)
	if err != nil {
		return "", err
	}

	for _, link := range order.Links {
		if link.Rel == "approve" {
			return link.Href, nil
		}
	}
	return "", errors.New("paypal: order response has no approve link")
}

func (p *PayPalProvider) ParseWebhook(r *http.Request) (*WebhookResult, error) {
	ctx := r.Context()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		return nil, err
	}
	// VerifyWebhookSignature also drains+restores r.Body, but restore it
	// ourselves first so we're not relying on that side effect.
	r.Body = io.NopCloser(bytes.NewReader(body))

	c, err := p.client(ctx)
	if err != nil {
		return nil, err
	}

	verify, err := c.VerifyWebhookSignature(ctx, r, p.webhookID)
	if err != nil {
		return nil, fmt.Errorf("paypal: verify webhook signature: %w", err)
	}
	if verify.VerificationStatus != "SUCCESS" {
		return nil, errors.New("paypal: webhook signature verification failed")
	}

	var event paypal.AnyEvent
	if err := json.Unmarshal(body, &event); err != nil {
		return nil, fmt.Errorf("paypal: decode webhook event: %w", err)
	}

	if event.EventType != "PAYMENT.CAPTURE.COMPLETED" && event.EventType != "CHECKOUT.ORDER.APPROVED" {
		return &WebhookResult{Completed: false}, nil
	}

	customID, orderID, amountGBP, err := extractPayPalResource(event.EventType, event.Resource)
	if err != nil {
		return nil, err
	}

	userID, months, err := parsePayPalCustomID(customID)
	if err != nil {
		return nil, err
	}

	return &WebhookResult{
		UserID:    userID,
		Months:    months,
		OrderID:   orderID,
		AmountGBP: amountGBP,
		Completed: true,
	}, nil
}

// extractPayPalResource pulls (custom_id, order/capture id, amount) out of a
// webhook event's resource, whose shape depends on the event type: a
// PAYMENT.CAPTURE.COMPLETED resource is a capture (paypal.CaptureAmount),
// while a CHECKOUT.ORDER.APPROVED resource is the order itself
// (paypal.Order), with custom_id/amount living on its first purchase unit.
func extractPayPalResource(eventType string, raw json.RawMessage) (customID, id string, amountGBP float64, err error) {
	switch eventType {
	case "PAYMENT.CAPTURE.COMPLETED":
		var capture paypal.CaptureAmount
		if err = json.Unmarshal(raw, &capture); err != nil {
			return "", "", 0, fmt.Errorf("paypal: decode capture resource: %w", err)
		}
		id = capture.ID
		customID = capture.CustomID
		if capture.Amount != nil {
			amountGBP, err = strconv.ParseFloat(capture.Amount.Value, 64)
			if err != nil {
				return "", "", 0, fmt.Errorf("paypal: bad capture amount: %w", err)
			}
		}
	case "CHECKOUT.ORDER.APPROVED":
		var order paypal.Order
		if err = json.Unmarshal(raw, &order); err != nil {
			return "", "", 0, fmt.Errorf("paypal: decode order resource: %w", err)
		}
		id = order.ID
		if len(order.PurchaseUnits) == 0 {
			return "", "", 0, errors.New("paypal: order resource has no purchase units")
		}
		unit := order.PurchaseUnits[0]
		customID = unit.CustomID
		if unit.Amount != nil {
			amountGBP, err = strconv.ParseFloat(unit.Amount.Value, 64)
			if err != nil {
				return "", "", 0, fmt.Errorf("paypal: bad purchase unit amount: %w", err)
			}
		}
	default:
		return "", "", 0, fmt.Errorf("paypal: unsupported event type %q", eventType)
	}
	return customID, id, amountGBP, nil
}

// parsePayPalCustomID splits a "user_id:months" custom_id, as set in
// InitiateCheckout, back into its parts.
func parsePayPalCustomID(customID string) (userID, months int, err error) {
	parts := strings.SplitN(customID, ":", 2)
	if len(parts) != 2 {
		return 0, 0, fmt.Errorf("paypal: malformed custom_id %q", customID)
	}
	userID, err = strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, fmt.Errorf("paypal: bad user id in custom_id %q: %w", customID, err)
	}
	months, err = strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, fmt.Errorf("paypal: bad months in custom_id %q: %w", customID, err)
	}
	return userID, months, nil
}
