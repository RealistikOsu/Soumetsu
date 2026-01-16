package handlers

import (
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/adapters/api"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/gorilla/sessions"
)

type PasswordHandler struct {
	config    *config.Config
	apiClient *api.Client
	csrf      middleware.CSRFService
	store     middleware.SessionStore
	templates *response.TemplateEngine
}

func NewPasswordHandler(
	cfg *config.Config,
	apiClient *api.Client,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
) *PasswordHandler {
	return &PasswordHandler{
		config:    cfg,
		apiClient: apiClient,
		csrf:      csrf,
		store:     store,
		templates: templates,
	}
}

func (h *PasswordHandler) ChangePage(w http.ResponseWriter, r *http.Request) {
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

	token, _ := sess.Values["token"].(string)

	email := ""
	emailResp, err := h.apiClient.GetEmail(r.Context(), token)
	if err == nil && emailResp != nil {
		email = emailResp.Email
	}

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
		h.changeResp(w, r, sess, models.NewError("Invalid form data."))
		return
	}

	if ok, _ := h.csrf.Validate(reqCtx.User.ID, r.FormValue("csrf")); !ok {
		h.changeResp(w, r, sess, models.NewError("Your session has expired. Please try redoing what you were trying to do."))
		return
	}

	token, _ := sess.Values["token"].(string)
	currentPassword := r.FormValue("currentpassword")
	newPassword := r.FormValue("newpassword")
	email := r.FormValue("email")

	var newPasswordPtr *string
	var newEmailPtr *string
	if newPassword != "" {
		newPasswordPtr = &newPassword
	}
	if email != "" {
		newEmailPtr = &email
	}

	err = h.apiClient.ChangePassword(r.Context(), token, &api.ChangePasswordRequest{
		CurrentPassword: currentPassword,
		NewPassword:     newPasswordPtr,
		NewEmail:        newEmailPtr,
	})
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.changeResp(w, r, sess, models.NewError(apiErr.Code))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	h.addMessage(sess, models.NewSuccess("Your settings have been saved."))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/password", http.StatusFound)
}

func (h *PasswordHandler) changeResp(w http.ResponseWriter, r *http.Request, sess *sessions.Session, messages ...models.Message) {
	token, _ := sess.Values["token"].(string)

	email := ""
	emailResp, err := h.apiClient.GetEmail(r.Context(), token)
	if err == nil && emailResp != nil {
		email = emailResp.Email
	}

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
	RedirectToLogin(w, r, h.store)
}

func (h *PasswordHandler) addMessage(sess *sessions.Session, msg models.Message) {
	AddMessage(sess, msg)
}
