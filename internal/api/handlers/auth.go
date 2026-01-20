package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/adapters/api"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/RealistikOsu/soumetsu/internal/services"
	"github.com/RealistikOsu/soumetsu/internal/services/auth"
	"github.com/gorilla/sessions"
)

type AuthHandler struct {
	config      *config.Config
	authService *auth.Service
	apiClient   *api.Client
	csrf        middleware.CSRFService
	store       middleware.SessionStore
	templates   *response.TemplateEngine
}

func NewAuthHandler(
	cfg *config.Config,
	authService *auth.Service,
	apiClient *api.Client,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
) *AuthHandler {
	return &AuthHandler{
		config:      cfg,
		authService: authService,
		apiClient:   apiClient,
		csrf:        csrf,
		store:       store,
		templates:   templates,
	}
}

func (h *AuthHandler) LoginPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.templates.Render(w, "auth/login.html", &response.TemplateData{
		TitleBar:  "Login",
		KyutGrill: "login.jpg",
		Path:      r.URL.Path,
		FormData:  NormaliseURLValues(r.PostForm),
	})
}

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

	result, err := h.authService.Login(r.Context(), auth.LoginInput{
		Username: username,
		Password: password,
	})
	if err != nil {
		if pendingErr, ok := err.(*auth.PendingVerificationError); ok {
			h.setIdentityCookie(w, r, pendingErr.UserID)
			h.addMessage(sess, models.NewWarning("You will need to verify your account first."))
			sess.Save(r, w)
			http.Redirect(w, r, "/register/verify?u="+strconv.Itoa(pendingErr.UserID), http.StatusFound)
			return
		}
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.loginResp(w, r, models.NewError(svcErr.Message))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	h.setIdentityCookie(w, r, result.UserID)

	clientIP := apicontext.ClientIP(r)
	if err := h.authService.LogIP(r.Context(), result.UserID, clientIP); err != nil {
		slog.Error("failed to log IP", "error", err, "user_id", result.UserID, "ip", clientIP)
	}
	h.setCountryInBackground(result.UserID, clientIP)

	sess.Values["userid"] = result.UserID
	sess.Values["token"] = result.Token
	sess.Values["logout"] = crypto.GenerateLogoutKey()

	redir := r.FormValue("redir")
	if len(redir) > 0 && redir[0] != '/' {
		redir = ""
	}
	if redir == "" {
		redir = "/"
	}

	h.addMessage(sess, models.NewSuccess("Welcome back "+result.Username+"! You have been logged into RealistikOsu!"))
	sess.Save(r, w)
	http.Redirect(w, r, redir, http.StatusFound)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
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

	logoutKey, _ := sess.Values["logout"].(string)
	if logoutKey != r.URL.Query().Get("k") {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
			TitleBar: "Log out",
			Messages: []models.Message{models.NewWarning("Your session has expired. Please try redoing what you were trying to do.")},
		})
		return
	}

	token, _ := sess.Values["token"].(string)
	if token != "" {
		h.authService.Logout(r.Context(), token)
	}

	for key := range sess.Values {
		delete(sess.Values, key)
	}

	http.SetCookie(w, &http.Cookie{
		Name:   "rt",
		Value:  "",
		MaxAge: -1,
	})

	h.addMessage(sess, models.NewSuccess("Successfully logged out."))
	sess.Save(r, w)
	http.Redirect(w, r, "/", http.StatusFound)
}

func (h *AuthHandler) RegisterPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Forbidden(w, r)
		return
	}

	if r.URL.Query().Get("stopsign") != "1" {
		existingUser, _, _ := h.authService.CheckMultiAccount(r.Context(), apicontext.ClientIP(r), h.getIdentityCookie(r))
		if existingUser != "" {
			h.templates.Render(w, "auth/register/peppy.html", &response.TemplateData{
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
		Captcha:  r.FormValue("h-captcha-response"),
	}

	userID, err := h.authService.Register(r.Context(), input)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.registerResp(w, r, models.NewError(svcErr.Message))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	h.setIdentityCookie(w, r, userID)

	clientIP := apicontext.ClientIP(r)
	if err := h.authService.LogIP(r.Context(), userID, clientIP); err != nil {
		slog.Error("failed to log IP", "error", err, "user_id", userID, "ip", clientIP)
	}
	h.setCountryInBackground(userID, clientIP)

	h.addMessage(sess, models.NewSuccess("You have been successfully registered on RealistikOsu! You now need to verify your account."))
	sess.Save(r, w)
	http.Redirect(w, r, "/register/verify?u="+strconv.Itoa(userID), http.StatusFound)
}

func (h *AuthHandler) VerifyAccountPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Forbidden(w, r)
		return
	}

	userID, valid := h.validateIdentityCookie(r)
	if !valid {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Invalid or expired session."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	user, err := h.apiClient.GetUser(r.Context(), userID, 0, 0)
	if err != nil || user == nil {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Invalid or expired session."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	if user.User.Privileges&int(models.UserPrivilegePendingVerification) == 0 {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Invalid or expired session."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.templates.Render(w, "auth/register/verify.html", &response.TemplateData{
		TitleBar:       "Verify account",
		HeadingOnRight: true,
		KyutGrill:      "welcome.jpg",
	})
}

func (h *AuthHandler) WelcomePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Forbidden(w, r)
		return
	}

	userID, valid := h.validateIdentityCookie(r)
	if !valid {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Invalid or expired session."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	user, err := h.apiClient.GetUser(r.Context(), userID, 0, 0)
	if err != nil || user == nil {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("Invalid or expired session."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	if user.User.Privileges&int(models.UserPrivilegePendingVerification) > 0 {
		http.Redirect(w, r, "/register/verify?u="+r.URL.Query().Get("u"), http.StatusFound)
		return
	}

	title := "Welcome!"
	if user.User.Privileges&int(models.UserPrivilegePublic) == 0 {
		title = "Welcome back!"
	}

	h.templates.Render(w, "auth/register/welcome.html", &response.TemplateData{
		TitleBar:       title,
		HeadingOnRight: true,
		KyutGrill:      "welcome.jpg",
	})
}

func (h *AuthHandler) loginResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	h.templates.Render(w, "auth/login.html", &response.TemplateData{
		TitleBar:  "Login",
		KyutGrill: "login.jpg",
		Messages:  messages,
		FormData:  NormaliseURLValues(r.PostForm),
		Path:      r.URL.Path,
	})
}

func (h *AuthHandler) registerResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	h.templates.Render(w, "auth/register/register.html", &response.TemplateData{
		TitleBar:  "Register",
		KyutGrill: "register.jpg",
		Scripts:   []string{"https://js.hcaptcha.com/1/api.js"},
		Messages:  messages,
		FormData:  NormaliseURLValues(r.PostForm),
	})
}

func (h *AuthHandler) addMessage(sess *sessions.Session, msg models.Message) {
	AddMessage(sess, msg)
}

func (h *AuthHandler) getIdentityCookie(r *http.Request) string {
	cookie, err := r.Cookie("y")
	if err != nil {
		return ""
	}
	return cookie.Value
}

func (h *AuthHandler) setIdentityCookie(w http.ResponseWriter, r *http.Request, userID int) {
	token, err := h.authService.SetIdentityCookie(r.Context(), userID)
	if err != nil {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     "y",
		Value:    token,
		Path:     "/",
		MaxAge:   60 * 60 * 24 * 365,
		HttpOnly: true,
	})
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

	valid, err := h.authService.ValidateIdentityToken(r.Context(), identityToken, userID)
	if err != nil || !valid {
		return 0, false
	}

	return userID, true
}

// setCountryInBackground sets the user's country based on their IP address.
// This runs as a background task with its own timeout, independent of the HTTP request,
// because the operation is non-critical and should complete even if the client disconnects.
func (h *AuthHandler) setCountryInBackground(userID int, clientIP string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := h.authService.SetCountry(ctx, userID, clientIP); err != nil {
			slog.Error("failed to set country", "error", err, "user_id", userID, "ip", clientIP)
		}
	}()
}
