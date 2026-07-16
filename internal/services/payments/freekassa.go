package payments

import (
	"context"
	"crypto/md5"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type FreeKassaProvider struct {
	merchantID string
	secret1    string // payment-URL signature
	secret2    string // webhook signature
	payURL     string
	baseURL    string
}

func NewFreeKassaProvider(merchantID, secret1, secret2, payURL, baseURL string) *FreeKassaProvider {
	return &FreeKassaProvider{merchantID, secret1, secret2, payURL, baseURL}
}

func (p *FreeKassaProvider) Name() string             { return "freekassa" }
func (p *FreeKassaProvider) BonusMultiplier() float64 { return 1.00 }

func (p *FreeKassaProvider) InitiateCheckout(ctx context.Context, req CheckoutRequest) (string, error) {
	priceUSD := req.PriceGBP * 1.34
	amount := fmt.Sprintf("%.2f", priceUSD)
	currency := "USD"
	orderID := fmt.Sprintf("%d", time.Now().UnixNano())
	sig := md5hex(fmt.Sprintf("%s:%s:%s:%s:%s", p.merchantID, amount, p.secret1, currency, orderID))
	q := url.Values{
		"m": {p.merchantID}, "oa": {amount}, "currency": {currency}, "o": {orderID},
		"s": {sig}, "us_months": {strconv.Itoa(req.Months)}, "us_user_id": {strconv.Itoa(req.UserID)},
	}
	return p.payURL + "?" + q.Encode(), nil
}

func (p *FreeKassaProvider) ParseWebhook(r *http.Request) (*WebhookResult, error) {
	if err := r.ParseForm(); err != nil {
		return nil, err
	}
	amount := r.PostForm.Get("AMOUNT")
	orderID := r.PostForm.Get("MERCHANT_ORDER_ID")
	got := r.PostForm.Get("SIGN")
	want := md5hex(fmt.Sprintf("%s:%s:%s:%s", p.merchantID, amount, p.secret2, orderID))
	if !strings.EqualFold(got, want) {
		return nil, errors.New("freekassa: signature mismatch")
	}
	months, _ := strconv.Atoi(r.PostForm.Get("us_months"))
	userID, _ := strconv.Atoi(r.PostForm.Get("us_user_id"))
	amt, _ := strconv.ParseFloat(amount, 64)
	return &WebhookResult{UserID: userID, Months: months, OrderID: orderID, AmountGBP: amt, Completed: true}, nil
}

func md5hex(s string) string { h := md5.Sum([]byte(s)); return fmt.Sprintf("%x", h) }
