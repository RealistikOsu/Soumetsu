// Package handlers provides HTTP request handlers for the API.
package handlers

import (
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/services"
	"github.com/RealistikOsu/soumetsu/internal/services/auth"
	"github.com/gorilla/sessions"
)

// AuthHandler handles authentication-related requests.
type AuthHandler struct {
	config      *config.Config
	authService *auth.Service
	csrf        middleware.CSRFService
	store       middleware.SessionStore
	templates   *response.TemplateEngine
	db          *mysql.DB
	redis       *redis.Client
}

// NewAuthHandler creates a new auth handler.
func NewAuthHandler(
	cfg *config.Config,
	authService *auth.Service,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
	db *mysql.DB,
	redis *redis.Client,
) *AuthHandler {
	return &AuthHandler{
		config:      cfg,
		authService: authService,
		csrf:        csrf,
		store:       store,
		templates:   templates,
		db:          db,
		redis:       redis,
	}
}

// LoginPage renders the login page.
func (h *AuthHandler) LoginPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.templates.Render(w, "login.html", &response.TemplateData{
		TitleBar:   "Login",
		KyutGrill:  "login.jpg",
		Path:       r.URL.Path,
		FormData:   normaliseURLValues(r.PostForm),
	})
}

// Login handles login form submission.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.loginResp(w, r, models.NewError("You're already logged in!"))
		return
	}

	if err := r.ParseForm(); err != nil {
		h.loginResp(w, r, models.NewError("Invalid form data."))
		return
	}

	username := r.FormValue("username")
	password := r.FormValue("password")

	if username == "" || password == "" {
		h.loginResp(w, r, models.NewError("Username or password not set."))
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	// Attempt login
	user, token, err := h.authService.Login(r.Context(), username, password, apicontext.ClientIP(r))
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			// Handle pending verification
			if svcErr.Code == "pending_verification" {
				h.authService.SetIdentityCookie(w, user.ID)
				h.addMessage(sess, models.NewWarning("You will need to verify your account first."))
				sess.Save(r, w)
				http.Redirect(w, r, "/register/verify?u="+strconv.Itoa(user.ID), http.StatusFound)
				return
			}
			// Handle old password version
			if svcErr.Code == "old_password" {
				h.addMessage(sess, models.NewWarning("Your password is sooooooo old, that we don't even know how to deal with it anymore. Could you please change it?"))
				sess.Save(r, w)
				http.Redirect(w, r, "/password-reset", http.StatusFound)
				return
			}
			h.loginResp(w, r, models.NewError(svcErr.Message))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	// Set identity cookie
	h.authService.SetIdentityCookie(w, user.ID)

	// Set session values
	sess.Values["userid"] = user.ID
	sess.Values["pw"] = token.PasswordHash
	sess.Values["logout"] = token.LogoutKey
	sess.Values["token"] = token.APIToken

	// Handle redirect
	redir := r.FormValue("redir")
	if len(redir) > 0 && redir[0] != '/' {
		redir = ""
	}
	if redir == "" {
		redir = "/"
	}

	h.addMessage(sess, models.NewSuccess("Welcome back "+user.Username+"! You have been logged into RealistikOsu!"))
	sess.Save(r, w)
	http.Redirect(w, r, redir, http.StatusFound)
}

// Logout handles user logout.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Render(w, "empty.html", &response.TemplateData{
			TitleBar: "Log out",
			Messages: []models.Message{models.NewWarning("You're already logged out!")},
		})
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	// Verify logout key
	logoutKey, _ := sess.Values["logout"].(string)
	if logoutKey != r.URL.Query().Get("k") {
		h.templates.Render(w, "empty.html", &response.TemplateData{
			TitleBar: "Log out",
			Messages: []models.Message{models.NewWarning("Your session has expired. Please try redoing what you were trying to do.")},
		})
		return
	}

	// Clear session
	for key := range sess.Values {
		delete(sess.Values, key)
	}

	// Clear identity cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "rt",
		Value:  "",
		MaxAge: -1,
	})

	h.addMessage(sess, models.NewSuccess("Successfully logged out."))
	sess.Save(r, w)
	http.Redirect(w, r, "/", http.StatusFound)
}

// RegisterPage renders the registration page.
func (h *AuthHandler) RegisterPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Forbidden(w, r)
		return
	}

	// Check for potential multi-account
	if r.URL.Query().Get("stopsign") != "1" {
		existingUser, _ := h.authService.CheckMultiAccount(r.Context(), apicontext.ClientIP(r), h.getIdentityCookie(r))
		if existingUser != "" {
			h.templates.Render(w, "register/peppy.html", &response.TemplateData{
				TitleBar: "Register",
				Extra: map[string]interface{}{
					"Username": existingUser,
				},
			})
			return
		}
	}

	h.registerResp(w, r)
}

// Register handles registration form submission.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Forbidden(w, r)
		return
	}

	if err := r.ParseForm(); err != nil {
		h.registerResp(w, r, models.NewError("Invalid form data."))
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	input := auth.RegisterInput{
		Username: strings.TrimSpace(r.FormValue("username")),
		Email:    r.FormValue("email"),
		Password: r.FormValue("password"),
		ClientIP: apicontext.ClientIP(r),
	}

	// Attempt registration
	user, err := h.authService.Register(r.Context(), input)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.registerResp(w, r, models.NewError(svcErr.Message))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	// Set identity cookie
	h.authService.SetIdentityCookie(w, user.ID)

	h.addMessage(sess, models.NewSuccess("You have been successfully registered on RealistikOsu! You now need to verify your account."))
	sess.Save(r, w)
	http.Redirect(w, r, "/register/verify?u="+strconv.Itoa(user.ID), http.StatusFound)
}

// VerifyAccountPage renders the account verification page.
func (h *AuthHandler) VerifyAccountPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Forbidden(w, r)
		return
	}

	userID, valid := h.validateIdentityCookie(r)
	if !valid {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Nope."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	// Check if user needs verification
	var privileges uint64
	h.db.QueryRowContext(r.Context(), "SELECT privileges FROM users WHERE id = ?", userID).Scan(&privileges)
	if privileges&(1<<20) == 0 { // UserPrivilegePendingVerification
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Nope."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.templates.Render(w, "register/verify.html", &response.TemplateData{
		TitleBar:       "Verify account",
		HeadingOnRight: true,
		KyutGrill:      "welcome.jpg",
	})
}

// WelcomePage renders the welcome page after verification.
func (h *AuthHandler) WelcomePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Forbidden(w, r)
		return
	}

	userID, valid := h.validateIdentityCookie(r)
	if !valid {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Nope."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	var privileges uint64
	h.db.QueryRowContext(r.Context(), "SELECT privileges FROM users WHERE id = ?", userID).Scan(&privileges)
	if privileges&(1<<20) > 0 { // UserPrivilegePendingVerification
		http.Redirect(w, r, "/register/verify?u="+r.URL.Query().Get("u"), http.StatusFound)
		return
	}

	title := "Welcome!"
	if privileges&1 == 0 { // Not normal (banned - multiaccounted)
		title = "Welcome back!"
	}

	h.templates.Render(w, "register/welcome.html", &response.TemplateData{
		TitleBar:       title,
		HeadingOnRight: true,
		KyutGrill:      "welcome.jpg",
	})
}

// Helper methods

func (h *AuthHandler) loginResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	h.templates.Render(w, "login.html", &response.TemplateData{
		TitleBar:  "Login",
		KyutGrill: "login.jpg",
		Messages:  messages,
		FormData:  normaliseURLValues(r.PostForm),
		Path:      r.URL.Path,
	})
}

func (h *AuthHandler) registerResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	h.templates.Render(w, "register/register.html", &response.TemplateData{
		TitleBar:  "Register",
		KyutGrill: "register.jpg",
		Scripts:   []string{"https://js.hcaptcha.com/1/api.js"},
		Messages:  messages,
		FormData:  normaliseURLValues(r.PostForm),
	})
}

func (h *AuthHandler) addMessage(sess *sessions.Session, msg models.Message) {
	messages, _ := sess.Values["messages"].([]models.Message)
	sess.Values["messages"] = append(messages, msg)
}

func (h *AuthHandler) getIdentityCookie(r *http.Request) string {
	cookie, err := r.Cookie("y")
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (h *AuthHandler) validateIdentityCookie(r *http.Request) (int, bool) {
	userIDStr := r.URL.Query().Get("u")
	userID, _ := strconv.Atoi(userIDStr)
	if userID == 0 {
		return 0, false
	}

	identityToken := h.getIdentityCookie(r)
	if identityToken == "" {
		return 0, false
	}

	var exists int
	err := h.db.QueryRowContext(r.Context(),
		"SELECT 1 FROM identity_tokens WHERE token = ? AND userid = ?",
		identityToken, userID).Scan(&exists)
	if err != nil {
		return 0, false
	}

	return userID, true
}

func normaliseURLValues(uv url.Values) map[string][]string {
	if uv == nil {
		return nil
	}
	return map[string][]string(uv)
}
