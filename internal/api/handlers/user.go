package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/RealistikOsu/soumetsu/internal/adapters/api"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/gorilla/sessions"
)

type UserHandler struct {
	config    *config.Config
	apiClient *api.Client
	csrf      middleware.CSRFService
	store     middleware.SessionStore
	templates *response.TemplateEngine
}

func NewUserHandler(
	cfg *config.Config,
	apiClient *api.Client,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
) *UserHandler {
	return &UserHandler{
		config:    cfg,
		apiClient: apiClient,
		csrf:      csrf,
		store:     store,
		templates: templates,
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

	sess, _ := h.store.Get(r, "session")
	token, _ := sess.Values["token"].(string)

	var settingsMap map[string]interface{}
	settings, err := h.apiClient.GetSettings(r.Context(), token)
	if err == nil && settings != nil {
		settingsMap = map[string]interface{}{
			"email":          settings.Email,
			"username_aka":   settings.UsernameAka,
			"favourite_mode": settings.FavouriteMode,
			"play_style":     settings.PlayStyle,
			"custom_badge": map[string]interface{}{
				"show": settings.CustomBadge.Show,
				"icon": settings.CustomBadge.Icon,
				"name": settings.CustomBadge.Name,
			},
			"disabled_comments": settings.DisabledComments,
		}
	}

	h.templates.RenderWithRequest(w, r, "settings/profile.html", &response.TemplateData{
		TitleBar: "Settings",
		Context:  reqCtx,
		Extra: map[string]interface{}{
			"Settings": settingsMap,
		},
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

	sess, _ := h.store.Get(r, "session")

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

	token, _ := sess.Values["token"].(string)
	newUsername := r.FormValue("newuser")

	err := h.apiClient.ChangeUsername(r.Context(), token, newUsername)
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
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

	sess, _ := h.store.Get(r, "session")

	if err := r.ParseMultipartForm(5 << 20); err != nil { // 5MB max
		h.addMessage(sess, models.NewError("File too large. Maximum size is 5MB."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/avatar", http.StatusFound)
		return
	}

	file, header, err := r.FormFile("avatar")
	if err != nil {
		h.addMessage(sess, models.NewError("Please select an image to upload."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/avatar", http.StatusFound)
		return
	}
	defer file.Close()

	token, _ := sess.Values["token"].(string)

	_, err = h.apiClient.UploadAvatar(r.Context(), token, header.Filename, file, header.Header.Get("Content-Type"))
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
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

	sess, _ := h.store.Get(r, "session")

	if err := r.ParseMultipartForm(5 << 20); err != nil { // 5MB max
		h.addMessage(sess, models.NewError("File too large. Maximum size is 5MB."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/profile-banner", http.StatusFound)
		return
	}

	file, header, err := r.FormFile("banner")
	if err != nil {
		h.addMessage(sess, models.NewError("Please select an image to upload."))
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/profile-banner", http.StatusFound)
		return
	}
	defer file.Close()

	token, _ := sess.Values["token"].(string)

	_, err = h.apiClient.UploadBanner(r.Context(), token, header.Filename, file, header.Header.Get("Content-Type"))
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
		} else {
			h.addMessage(sess, models.NewError("Failed to upload banner."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/profile-banner", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Profile background updated!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/profile-banner", http.StatusFound)
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

	sess, _ := h.store.Get(r, "session")

	token, _ := sess.Values["token"].(string)

	err := h.apiClient.UnlinkDiscord(r.Context(), token)
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
		} else {
			h.addMessage(sess, models.NewError("An unexpected error occurred."))
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

	userpage, err := h.apiClient.GetUserpage(r.Context(), reqCtx.User.ID)
	content := ""
	if err == nil && userpage != nil {
		content = userpage.Content
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

	sess, _ := h.store.Get(r, "session")

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

	token, _ := sess.Values["token"].(string)
	content := r.FormValue("data")

	err := h.apiClient.UpdateUserpage(r.Context(), token, content)
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

func (h *UserHandler) TeamPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)

	h.templates.RenderWithRequest(w, r, "team.html", &response.TemplateData{
		TitleBar: "Team",
		Context:  reqCtx,
		Extra: map[string]interface{}{
			"TeamData": make(map[int]interface{}),
		},
	})
}

func (h *UserHandler) redirectToLogin(w http.ResponseWriter, r *http.Request) {
	RedirectToLogin(w, r, h.store)
}

func (h *UserHandler) addMessage(sess *sessions.Session, msg models.Message) {
	AddMessage(sess, msg)
}
