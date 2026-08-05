package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/RealistikOsu/soumetsu/internal/adapters/twitch"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
)

const twitchOAuthStateKey = "twitch_oauth_state"

// Bounds for the star rating filter. The upper bound is generous rather than
// exact — it only needs to reject nonsense, not track the hardest ranked map.
const (
	maxStarRating = 20.0
	maxCooldown   = 3600
)

// TwitchHandler serves the Twitch linking and beatmap-request settings pages.
//
// Unlike Discord linking — which delegates the code exchange to soumetsu-api —
// this flow runs entirely in-process against the database, because the request
// settings it manages are owned by the bot's schema rather than the API.
type TwitchHandler struct {
	config     *config.Config
	repo       *repositories.TwitchRepository
	csrf       middleware.CSRFService
	store      middleware.SessionStore
	templates  *response.TemplateEngine
	httpClient *http.Client
}

func NewTwitchHandler(
	cfg *config.Config,
	repo *repositories.TwitchRepository,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
) *TwitchHandler {
	return &TwitchHandler{
		config:     cfg,
		repo:       repo,
		csrf:       csrf,
		store:      store,
		templates:  templates,
		httpClient: http.DefaultClient,
	}
}

// Page renders the linking status and, when linked, the request settings form.
func (h *TwitchHandler) Page(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		RedirectToLogin(w, r, h.store)
		return
	}

	link, err := h.repo.GetByUserID(r.Context(), reqCtx.User.ID)
	if err != nil {
		h.redirectWithError(w, r, "lookup_failed")
		return
	}

	extra := map[string]interface{}{
		"twitchEnabled": h.config.Twitch.Enabled(),
		"twitchLinked":  link != nil,
	}

	if link != nil {
		excluded, err := h.repo.GetExcludedUsers(r.Context(), link.TwitchID)
		if err != nil {
			h.redirectWithError(w, r, "lookup_failed")
			return
		}

		extra["twitchID"] = strconv.FormatInt(link.TwitchID, 10)
		extra["twitchUsername"] = link.TwitchUsername
		extra["settings"] = link.Settings
		extra["excludedUsers"] = strings.Join(excluded, "\n")
	}

	h.templates.RenderWithRequest(w, r, "settings/twitch.html", &response.TemplateData{
		TitleBar: "Twitch",
		Context:  reqCtx,
		Extra:    extra,
	})
}

// Redirect both starts the OAuth flow and consumes its callback, mirroring the
// Discord handler. With no `code` query parameter it mints a CSRF `state`,
// stashes it in the session and sends the user to Twitch. With a `code` it
// validates `state`, exchanges the code, and persists the link.
func (h *TwitchHandler) Redirect(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		RedirectToLogin(w, r, h.store)
		return
	}

	if !h.config.Twitch.Enabled() {
		h.redirectWithError(w, r, "not_configured")
		return
	}

	sess, _ := h.store.Get(r, "session")
	redirectURI := h.config.App.BaseURL + "/settings/twitch/redirect"

	code := r.URL.Query().Get("code")
	if code == "" {
		// Twitch reports user-side refusals here rather than by omitting the code.
		if r.URL.Query().Get("error") != "" {
			h.redirectWithError(w, r, "denied")
			return
		}

		// Shares the CSRF-state helper used by the Discord flow in user.go.
		state, err := randomState(16)
		if err != nil {
			h.redirectWithError(w, r, "oauth_init_failed")
			return
		}

		sess.Values[twitchOAuthStateKey] = state
		_ = sess.Save(r, w)

		http.Redirect(w, r,
			twitch.AuthorizeURL(h.config.Twitch.AppClientID, redirectURI, state),
			http.StatusFound)
		return
	}

	// Callback. Consume the stored state regardless of outcome so a single
	// authorisation cannot be replayed.
	expectedState, _ := sess.Values[twitchOAuthStateKey].(string)
	delete(sess.Values, twitchOAuthStateKey)
	_ = sess.Save(r, w)

	if expectedState == "" || r.URL.Query().Get("state") != expectedState {
		h.redirectWithError(w, r, "state_mismatch")
		return
	}

	accessToken, err := twitch.ExchangeCode(
		r.Context(), h.httpClient,
		h.config.Twitch.AppClientID, h.config.Twitch.AppClientSecret,
		code, redirectURI,
	)
	if err != nil {
		h.redirectWithError(w, r, "token_exchange_failed")
		return
	}

	twitchUser, err := twitch.FetchUser(r.Context(), h.httpClient, h.config.Twitch.AppClientID, accessToken)
	if err != nil {
		h.redirectWithError(w, r, "profile_fetch_failed")
		return
	}

	twitchID, err := strconv.ParseInt(twitchUser.ID, 10, 64)
	if err != nil {
		h.redirectWithError(w, r, "profile_fetch_failed")
		return
	}

	taken, err := h.repo.LinkedToOtherUser(r.Context(), twitchID, reqCtx.User.ID)
	if err != nil {
		h.redirectWithError(w, r, "link_failed")
		return
	}
	if taken {
		h.redirectWithError(w, r, "already_linked")
		return
	}

	if err := h.repo.Link(r.Context(), reqCtx.User.ID, twitchID, strings.ToLower(twitchUser.Login)); err != nil {
		h.redirectWithError(w, r, "link_failed")
		return
	}

	RedirectWithMessage(w, r, h.store, "/settings/twitch?linked=1",
		models.NewSuccess("Twitch account linked. Beatmap requests are now enabled."))
}

// Unlink removes the link. Settings and exclusions cascade with it.
func (h *TwitchHandler) Unlink(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		RedirectToLogin(w, r, h.store)
		return
	}

	if err := h.repo.Unlink(r.Context(), reqCtx.User.ID); err != nil {
		h.redirectWithError(w, r, "unlink_failed")
		return
	}

	RedirectWithMessage(w, r, h.store, "/settings/twitch",
		models.NewSuccess("Twitch account unlinked."))
}

// UpdateSettings saves the request rules from the settings form.
func (h *TwitchHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		RedirectToLogin(w, r, h.store)
		return
	}

	if err := r.ParseForm(); err != nil {
		h.redirectWithError(w, r, "invalid_form")
		return
	}

	if ok, _ := h.csrf.Validate(reqCtx.User.ID, r.FormValue("csrf")); !ok {
		RedirectWithMessage(w, r, h.store, "/settings/twitch",
			models.NewError("Your session has expired. Please try redoing what you were trying to do."))
		return
	}

	link, err := h.repo.GetByUserID(r.Context(), reqCtx.User.ID)
	if err != nil {
		h.redirectWithError(w, r, "lookup_failed")
		return
	}
	if link == nil {
		h.redirectWithError(w, r, "not_linked")
		return
	}

	settings := repositories.TwitchSettings{
		Enabled:    r.FormValue("enabled") != "",
		Echo:       r.FormValue("echo") != "",
		SubOnly:    r.FormValue("sub_only") != "",
		PointsOnly: r.FormValue("points_only") != "",
		Cooldown:   clampInt(parseIntDefault(r.FormValue("cooldown"), 30), 0, maxCooldown),
	}

	// An unchecked star filter is stored as -1/-1, which the bot reads as "off".
	if r.FormValue("sr_filter") != "" {
		min := clampFloat(parseFloatDefault(r.FormValue("sr_min"), 0), 0, maxStarRating)
		max := clampFloat(parseFloatDefault(r.FormValue("sr_max"), maxStarRating), 0, maxStarRating)

		// An inverted range would reject every map. Treat it as user error and
		// swap rather than silently disabling requests.
		if min > max {
			min, max = max, min
		}

		settings.StarMin = min
		settings.StarMax = max
	} else {
		settings.StarMin = -1
		settings.StarMax = -1
	}

	if err := h.repo.UpdateSettings(r.Context(), link.TwitchID, settings); err != nil {
		h.redirectWithError(w, r, "save_failed")
		return
	}

	if err := h.repo.ReplaceExcludedUsers(
		r.Context(), link.TwitchID, parseExcludedUsers(r.FormValue("excluded_users")),
	); err != nil {
		h.redirectWithError(w, r, "save_failed")
		return
	}

	RedirectWithMessage(w, r, h.store, "/settings/twitch",
		models.NewSuccess("Beatmap request settings saved."))
}

func (h *TwitchHandler) redirectWithError(w http.ResponseWriter, r *http.Request, reason string) {
	http.Redirect(w, r, "/settings/twitch?error="+reason, http.StatusFound)
}

// parseExcludedUsers turns the newline- or comma-separated textarea into a
// deduplicated list of lowercase Twitch usernames.
func parseExcludedUsers(raw string) []string {
	fields := strings.FieldsFunc(raw, func(r rune) bool {
		return r == '\n' || r == '\r' || r == ',' || r == ' ' || r == '\t'
	})

	seen := make(map[string]struct{}, len(fields))
	users := make([]string, 0, len(fields))

	for _, field := range fields {
		name := strings.ToLower(strings.TrimPrefix(strings.TrimSpace(field), "@"))
		if name == "" {
			continue
		}
		// The column is VARCHAR(50); Twitch names top out at 25.
		if len(name) > 50 {
			continue
		}
		if _, dup := seen[name]; dup {
			continue
		}
		seen[name] = struct{}{}
		users = append(users, name)
	}

	return users
}

func parseIntDefault(raw string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return fallback
	}
	return value
}

func parseFloatDefault(raw string, fallback float64) float64 {
	value, err := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	if err != nil {
		return fallback
	}
	return value
}

func clampInt(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func clampFloat(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
