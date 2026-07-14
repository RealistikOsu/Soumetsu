package payments

import (
	"crypto/md5"
	"fmt"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestFreeKassa_ParseWebhook_ValidSig(t *testing.T) {
	p := NewFreeKassaProvider("MID", "w1", "w2", "https://x")
	amount, order := "5.00", "ord-1"
	sig := fmt.Sprintf("%x", md5.Sum([]byte(fmt.Sprintf("MID:%s:w2:%s", amount, order))))
	form := url.Values{"MERCHANT_ID": {"MID"}, "AMOUNT": {amount}, "MERCHANT_ORDER_ID": {order},
		"SIGN": {sig}, "us_months": {"3"}, "us_user_id": {"42"}}
	r := httptest.NewRequest("POST", "/webhooks/freekassa", strings.NewReader(form.Encode()))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := p.ParseWebhook(r)
	if err != nil {
		t.Fatal(err)
	}
	if !res.Completed || res.UserID != 42 || res.Months != 3 || res.OrderID != "ord-1" {
		t.Fatalf("bad result: %+v", res)
	}
}

func TestFreeKassa_ParseWebhook_BadSig(t *testing.T) {
	p := NewFreeKassaProvider("MID", "w1", "w2", "https://x")
	form := url.Values{"MERCHANT_ID": {"MID"}, "AMOUNT": {"5.00"}, "MERCHANT_ORDER_ID": {"ord-1"},
		"SIGN": {"deadbeef"}, "us_months": {"3"}, "us_user_id": {"42"}}
	r := httptest.NewRequest("POST", "/webhooks/freekassa", strings.NewReader(form.Encode()))
	r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if _, err := p.ParseWebhook(r); err == nil {
		t.Fatal("expected signature error")
	}
}
