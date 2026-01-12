package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/services"
	"github.com/RealistikOsu/soumetsu/internal/services/user"
	"github.com/gorilla/sessions"
)

type UserHandler struct {
	config      *config.Config
	userService *user.Service
	csrf        middleware.CSRFService
	store       middleware.SessionStore
	templates   *response.TemplateEngine
	db          *mysql.DB
}

func NewUserHandler(
	cfg *config.Config,
	userService *user.Service,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
	db *mysql.DB,
) *UserHandler {
	return &UserHandler{
		config:      cfg,
		userService: userService,
		csrf:        csrf,
		store:       store,
		templates:   templates,
		db:          db,
	}
}

func (h *UserHandler) Profile(w http.ResponseWriter, r *http.Request) {
	userParam := chi.URLParam(r, "id")
	if userParam == "" {
		userParam = chi.URLParam(r, "user")
	}

	_, err := strconv.Atoi(userParam)
	isNumeric := err == nil

	reqCtx := apicontext.GetRequestContextFromRequest(r)

	data := &response.TemplateData{
		TitleBar:  "Profile",
		DisableHH: true,
		Context:   reqCtx,
		Extra: map[string]interface{}{
			"UserID":    userParam,
			"IsNumeric": isNumeric,
		},
	}

	h.templates.Render(w, "profile.html", data)
}

func (h *UserHandler) SettingsPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.templates.RenderWithRequest(w, r, "settings/profile.html", &response.TemplateData{
		TitleBar: "Settings",
	})
}

func (h *UserHandler) ChangeUsernamePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.templates.RenderWithRequest(w, r, "settings/change-username.html", &response.TemplateData{
		TitleBar: "Change Username",
	})
}

func (h *UserHandler) ChangeUsername(w http.ResponseWriter, r *http.Request) {
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
		h.addMessage(sess, models.NewError("Invalid form data."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/change-username", http.StatusFound)
		return
	}

	if ok, _ := h.csrf.Validate(reqCtx.User.ID, r.FormValue("csrf")); !ok {
		h.addMessage(sess, models.NewError("Your session has expired. Please try redoing what you were trying to do."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/change-username", http.StatusFound)
		return
	}

	newUsername := r.FormValue("newuser")

	err = h.userService.ChangeUsername(r.Context(), user.ChangeUsernameInput{
		UserID:      reqCtx.User.ID,
		NewUsername: newUsername,
	})
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
		} else {
			h.addMessage(sess, models.NewError("An unexpected error occurred."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/change-username", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Your username has been changed."))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/change-username", http.StatusFound)
}

func (h *UserHandler) AvatarPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.templates.RenderWithRequest(w, r, "settings/avatar.html", &response.TemplateData{
		TitleBar: "Avatar",
	})
}

func (h *UserHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
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

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		h.addMessage(sess, models.NewError("File too large or invalid."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/avatar", http.StatusFound)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		h.addMessage(sess, models.NewError("Please select a file."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/avatar", http.StatusFound)
		return
	}
	defer file.Close()

	err = h.userService.UploadAvatar(r.Context(), reqCtx.User.ID, file, header.Filename)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
		} else {
			h.addMessage(sess, models.NewError("Failed to upload avatar."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/avatar", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Avatar updated successfully!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/avatar", http.StatusFound)
}

func (h *UserHandler) ProfileBackgroundPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.templates.RenderWithRequest(w, r, "settings/profile_banner.html", &response.TemplateData{
		TitleBar: "Profile Background",
	})
}

func (h *UserHandler) SetProfileBackground(w http.ResponseWriter, r *http.Request) {
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
		h.addMessage(sess, models.NewError("Invalid form data."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/profilebackground", http.StatusFound)
		return
	}

	bgType := chi.URLParam(r, "type")
	value := r.FormValue("value")
	if value == "" {
		value = r.FormValue("bg")
	}

	err = h.userService.SetProfileBackground(r.Context(), reqCtx.User.ID, bgType, value)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
		} else {
			h.addMessage(sess, models.NewError("Failed to set background."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/profilebackground", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Profile background updated!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/profilebackground", http.StatusFound)
}

func (h *UserHandler) DiscordPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.templates.RenderWithRequest(w, r, "settings/discord.html", &response.TemplateData{
		TitleBar: "Discord",
	})
}

func (h *UserHandler) UnlinkDiscord(w http.ResponseWriter, r *http.Request) {
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

	err = h.userService.UnlinkDiscord(r.Context(), reqCtx.User.ID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
		} else {
			h.addMessage(sess, models.NewError("Failed to unlink Discord."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/discord", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Discord account unlinked."))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/discord", http.StatusFound)
}

func (h *UserHandler) UserpageSettingsPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	content, err := h.userService.GetUserpage(r.Context(), reqCtx.User.ID)
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	h.templates.RenderWithRequest(w, r, "settings/user_page.html", &response.TemplateData{
		TitleBar: "Edit Userpage",
		Context:  reqCtx,
		Extra: map[string]interface{}{
			"Userpage": content,
		},
	})
}

func (h *UserHandler) UpdateUserpage(w http.ResponseWriter, r *http.Request) {
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
		h.addMessage(sess, models.NewError("Invalid form data."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/user-page", http.StatusFound)
		return
	}

	if ok, _ := h.csrf.Validate(reqCtx.User.ID, r.FormValue("csrf")); !ok {
		h.addMessage(sess, models.NewError("Your session has expired."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/user-page", http.StatusFound)
		return
	}

	content := r.FormValue("data")
	err = h.userService.UpdateUserpage(r.Context(), reqCtx.User.ID, content)
	if err != nil {
		h.addMessage(sess, models.NewError("Failed to update userpage."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/user-page", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Userpage updated successfully!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/user-page", http.StatusFound)
}

func (h *UserHandler) UserCardInfo(w http.ResponseWriter, r *http.Request) {
	idParam := chi.URLParam(r, "id")
	id, _ := strconv.Atoi(idParam)

	user, err := h.userService.GetByID(r.Context(), id)
	if err != nil || user == nil {
		response.JSONError(w, http.StatusNotFound, "User not found")
		return
	}

	bgType, bgValue, _ := h.userService.GetProfileBackground(r.Context(), id)

	response.JSONSuccess(w, map[string]interface{}{
		"id":         user.ID,
		"username":   user.Username,
		"country":    user.Country,
		"privileges": user.Privileges,
		"background": map[string]interface{}{
			"type":  bgType,
			"value": bgValue,
		},
	})
}

func (h *UserHandler) redirectToLogin(w http.ResponseWriter, r *http.Request) {
	sess, _ := h.store.Get(r, "session")
	h.addMessage(sess, models.NewWarning("You need to login first."))
	sess.Save(r, w)
	http.Redirect(w, r, "/login?redir="+r.URL.Path, http.StatusFound)
}

func (h *UserHandler) addMessage(sess *sessions.Session, msg models.Message) {
	messages, _ := sess.Values["messages"].([]models.Message)
	sess.Values["messages"] = append(messages, msg)
}
