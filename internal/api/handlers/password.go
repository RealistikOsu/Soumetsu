package handlers

import (
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/RealistikOsu/soumetsu/internal/services"
	"github.com/RealistikOsu/soumetsu/internal/services/auth"
	"github.com/RealistikOsu/soumetsu/internal/services/user"
	"github.com/gorilla/sessions"
)

type PasswordHandler struct {
	config      *config.Config
	authService *auth.Service
	userService *user.Service
	csrf        middleware.CSRFService
	store       middleware.SessionStore
	templates   *response.TemplateEngine
	db          *mysql.DB
}

func NewPasswordHandler(
	cfg *config.Config,
	authService *auth.Service,
	userService *user.Service,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
	db *mysql.DB,
) *PasswordHandler {
	return &PasswordHandler{
		config:      cfg,
		authService: authService,
		userService: userService,
		csrf:        csrf,
		store:       store,
		templates:   templates,
		db:          db,
	}
}

func (h *PasswordHandler) ResetPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
			TitleBar: "Password Reset",
			Messages: []models.Message{models.NewError("You're already logged in!")},
		})
		return
	}

	h.templates.Render(w, "password_reset.html", &response.TemplateData{
		TitleBar:  "Password Reset",
		KyutGrill: "pwreset.jpg",
		Scripts:   []string{"https://js.hcaptcha.com/1/api.js"},
	})
}

func (h *PasswordHandler) Reset(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID != 0 {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
			TitleBar: "Password Reset",
			Messages: []models.Message{models.NewError("You're already logged in!")},
		})
		return
	}

	if err := r.ParseForm(); err != nil {
		h.resetResp(w, r, models.NewError("Invalid form data."))
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	username := r.FormValue("username")

	err = h.authService.RequestPasswordReset(r.Context(), username)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.resetResp(w, r, models.NewError(svcErr.Message))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	h.addMessage(sess, models.NewSuccess("Done! You should receive an email to your original mailbox shortly!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/", http.StatusFound)
}

func (h *PasswordHandler) ResetContinuePage(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("k")
	if key == "" {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
			TitleBar: "Password Reset",
			Messages: []models.Message{models.NewError("Nope.")},
		})
		return
	}

	username, err := h.authService.GetPasswordResetUsername(r.Context(), key)
	if err != nil {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
			TitleBar: "Reset password",
			Messages: []models.Message{models.NewError("That key could not be found. Perhaps it expired?")},
		})
		return
	}

	h.templates.Render(w, "password_reset/continue.html", &response.TemplateData{
		TitleBar: "Reset Password",
		Extra: map[string]interface{}{
			"Username": username,
			"Key":      key,
		},
	})
}

func (h *PasswordHandler) ResetContinue(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
			TitleBar: "Reset password",
			Messages: []models.Message{models.NewError("Invalid form data.")},
		})
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	key := r.FormValue("k")
	password := r.FormValue("password")

	err = h.authService.ResetPassword(r.Context(), key, password)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			username, _ := h.authService.GetPasswordResetUsername(r.Context(), key)
			h.templates.Render(w, "password_reset/continue.html", &response.TemplateData{
				TitleBar: "Reset Password",
				Messages: []models.Message{models.NewError(svcErr.Message)},
				Extra: map[string]interface{}{
					"Username": username,
					"Key":      key,
				},
			})
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	h.addMessage(sess, models.NewSuccess("We have changed your password and you should now be able to login! Have fun!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/login", http.StatusFound)
}

func (h *PasswordHandler) ChangePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	var email string
	h.db.QueryRowContext(r.Context(), "SELECT email FROM users WHERE id = ?", reqCtx.User.ID).Scan(&email)

	h.templates.RenderWithRequest(w, r, "settings/password.html", &response.TemplateData{
		TitleBar: "Change Password",
		Context:  reqCtx,
		Extra: map[string]interface{}{
			"email": email,
		},
	})
}

func (h *PasswordHandler) Change(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	if err := r.ParseForm(); err != nil {
		h.changeResp(w, r, reqCtx.User.ID, models.NewError("Invalid form data."))
		return
	}

	if ok, _ := h.csrf.Validate(reqCtx.User.ID, r.FormValue("csrf")); !ok {
		h.changeResp(w, r, reqCtx.User.ID, models.NewError("Your session has expired. Please try redoing what you were trying to do."))
		return
	}

	currentPassword := r.FormValue("currentpassword")
	newPassword := r.FormValue("newpassword")
	email := r.FormValue("email")

	input := user.ChangePasswordInput{
		UserID:          reqCtx.User.ID,
		CurrentPassword: currentPassword,
		NewPassword:     newPassword,
		NewEmail:        email,
	}

	err = h.userService.ChangePassword(r.Context(), input)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.changeResp(w, r, reqCtx.User.ID, models.NewError(svcErr.Message))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	if newPassword != "" {
		sess.Values["pw"] = crypto.MD5(newPassword)
	}

	h.addMessage(sess, models.NewSuccess("Your settings have been saved."))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/password", http.StatusFound)
}

func (h *PasswordHandler) resetResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	h.templates.Render(w, "password_reset.html", &response.TemplateData{
		TitleBar:  "Password Reset",
		KyutGrill: "pwreset.jpg",
		Scripts:   []string{"https://js.hcaptcha.com/1/api.js"},
		Messages:  messages,
		FormData:  normaliseURLValues(r.PostForm),
	})
}

func (h *PasswordHandler) changeResp(w http.ResponseWriter, r *http.Request, userID int, messages ...models.Message) {
	var email string
	h.db.QueryRowContext(r.Context(), "SELECT email FROM users WHERE id = ?", userID).Scan(&email)

	reqCtx := apicontext.GetRequestContextFromRequest(r)

	h.templates.RenderWithRequest(w, r, "settings/password.html", &response.TemplateData{
		TitleBar: "Change Password",
		Context:  reqCtx,
		Messages: messages,
		Extra: map[string]interface{}{
			"email": email,
		},
	})
}

func (h *PasswordHandler) redirectToLogin(w http.ResponseWriter, r *http.Request) {
	RedirectToLogin(w, r, h.store) // Use shared implementation
}

func (h *PasswordHandler) addMessage(sess *sessions.Session, msg models.Message) {
	AddMessage(sess, msg) // Use shared implementation
}
