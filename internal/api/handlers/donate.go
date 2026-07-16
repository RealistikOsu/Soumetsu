package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
	"github.com/RealistikOsu/soumetsu/internal/services/payments"
)

type DonateHandler struct {
	service   *payments.Service
	repo      *repositories.DonationRepository
	providers map[string]payments.PaymentProvider
	csrf      middleware.CSRFService
}

func NewDonateHandler(
	service *payments.Service,
	repo *repositories.DonationRepository,
	providers map[string]payments.PaymentProvider,
	csrf middleware.CSRFService,
) *DonateHandler {
	return &DonateHandler{
		service:   service,
		repo:      repo,
		providers: providers,
		csrf:      csrf,
	}
}

// Checkout starts a checkout session with the named provider and redirects
// the user to the resulting payment page.
func (h *DonateHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	providerName := chi.URLParam(r, "provider")
	provider, ok := h.providers[providerName]
	if !ok {
		http.Error(w, "Unknown payment provider.", http.StatusBadRequest)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data.", http.StatusBadRequest)
		return
	}

	months, err := strconv.Atoi(r.FormValue("months"))
	if err != nil || months < 1 {
		http.Error(w, "Invalid number of months.", http.StatusBadRequest)
		return
	}

	reqCtx := apicontext.GetRequestContextFromRequest(r)

	if ok, _ := h.csrf.Validate(reqCtx.User.ID, r.FormValue("csrf")); !ok {
		http.Error(w, "invalid csrf", http.StatusForbidden)
		return
	}

	recipient := r.FormValue("username")
	if recipient == "" {
		recipient = reqCtx.User.Username
	}

	uid, err := h.repo.UserIDByUsername(r.Context(), recipient)
	if err != nil {
		http.Error(w, "Failed to resolve recipient.", http.StatusInternalServerError)
		return
	}
	if uid == 0 {
		http.Error(w, "Unknown recipient username.", http.StatusBadRequest)
		return
	}

	redirectURL, err := provider.InitiateCheckout(r.Context(), payments.CheckoutRequest{
		UserID:   uid,
		Username: recipient,
		Months:   months,
		PriceGBP: payments.CalculateDonorPrice(months),
	})
	if err != nil {
		http.Error(w, "Failed to initiate checkout.", http.StatusBadGateway)
		return
	}

	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// Webhook receives and verifies a provider's payment notification, then
// fulfils the donation. Intentionally exempt from CSRF/session auth — the
// caller is the payment provider, not a logged-in browser.
func (h *DonateHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	providerName := chi.URLParam(r, "provider")
	provider, ok := h.providers[providerName]
	if !ok {
		http.Error(w, "Unknown payment provider.", http.StatusBadRequest)
		return
	}

	res, err := provider.ParseWebhook(r)
	if err != nil {
		http.Error(w, "Invalid webhook payload.", http.StatusBadRequest)
		return
	}

	if err := h.service.Fulfill(r.Context(), provider, *res); err != nil {
		http.Error(w, "Failed to fulfil donation.", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
