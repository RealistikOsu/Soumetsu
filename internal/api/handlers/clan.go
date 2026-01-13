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

type ClanHandler struct {
	config    *config.Config
	apiClient *api.Client
	csrf      middleware.CSRFService
	store     middleware.SessionStore
	templates *response.TemplateEngine
}

func NewClanHandler(
	cfg *config.Config,
	apiClient *api.Client,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
) *ClanHandler {
	return &ClanHandler{
		config:    cfg,
		apiClient: apiClient,
		csrf:      csrf,
		store:     store,
		templates: templates,
	}
}

func (h *ClanHandler) ClanPage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	clanParam := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanParam)

	h.templates.Render(w, "clans/clan.html", &response.TemplateData{
		TitleBar:  "Clan",
		DisableHH: true,
		Context:   reqCtx,
		Extra: map[string]interface{}{
			"ClanID":    clanID,
			"ClanParam": clanParam,
		},
	})
}

func (h *ClanHandler) CreatePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.createResp(w, r)
}

func (h *ClanHandler) Create(w http.ResponseWriter, r *http.Request) {
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
		h.createResp(w, r, models.NewError("Invalid form data."))
		return
	}

	token, _ := sess.Values["token"].(string)

	clan, err := h.apiClient.CreateClan(r.Context(), token, &api.CreateClanRequest{
		Name:        r.FormValue("name"),
		Tag:         r.FormValue("tag"),
		Description: r.FormValue("description"),
	})
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.createResp(w, r, models.NewError(apiErr.Code))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	h.addMessage(sess, models.NewSuccess("Clan created."))
	sess.Save(r, w)
	http.Redirect(w, r, "/clans/"+strconv.Itoa(clan.ID), http.StatusFound)
}

func (h *ClanHandler) Leave(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Forbidden(w, r)
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	token, _ := sess.Values["token"].(string)
	clanIDStr := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanIDStr)

	err = h.apiClient.LeaveClan(r.Context(), token, clanID)
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
		} else {
			h.addMessage(sess, models.NewError("An unexpected error occurred."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("You've left the clan."))
	sess.Save(r, w)
	http.Redirect(w, r, "/", http.StatusFound)
}

func (h *ClanHandler) Disband(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Forbidden(w, r)
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	token, _ := sess.Values["token"].(string)
	clanIDStr := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanIDStr)

	err = h.apiClient.DeleteClan(r.Context(), token, clanID)
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
		} else {
			h.addMessage(sess, models.NewError("An unexpected error occurred."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Your clan has been disbanded."))
	sess.Save(r, w)
	http.Redirect(w, r, "/", http.StatusFound)
}

func (h *ClanHandler) JoinInvite(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Forbidden(w, r)
		return
	}

	if reqCtx.User.IsBanned() {
		h.templates.Forbidden(w, r)
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	token, _ := sess.Values["token"].(string)
	inviteCode := chi.URLParam(r, "inv")

	clan, err := h.apiClient.JoinClanByInvite(r.Context(), token, inviteCode)
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
		} else {
			h.addMessage(sess, models.NewError("An unexpected error occurred."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("You've joined the clan!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/clans/"+strconv.Itoa(clan.ID), http.StatusFound)
}

func (h *ClanHandler) Kick(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Forbidden(w, r)
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
		http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
		return
	}

	token, _ := sess.Values["token"].(string)
	memberID, _ := strconv.Atoi(r.FormValue("member"))

	// Need to get clan ID from user's clan membership
	// For now this is a placeholder
	clanID := reqCtx.User.Clan

	err = h.apiClient.KickClanMember(r.Context(), token, clanID, memberID)
	if err != nil {
		if apiErr, ok := err.(*api.APIError); ok {
			h.addMessage(sess, models.NewError(apiErr.Code))
		} else {
			h.addMessage(sess, models.NewError("An unexpected error occurred."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Member has been removed."))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
}

func (h *ClanHandler) ManagePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.templates.Render(w, "settings/clans/manage.html", &response.TemplateData{
		TitleBar: "Manage Clan",
		Context:  reqCtx,
	})
}

func (h *ClanHandler) UpdateClan(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Forbidden(w, r)
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
		http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
		return
	}

	token, _ := sess.Values["token"].(string)
	clanID := reqCtx.User.Clan

	name := r.FormValue("name")
	description := r.FormValue("description")
	icon := r.FormValue("icon")
	tag := r.FormValue("tag")

	if name != "" || description != "" || icon != "" || tag != "" {
		req := &api.UpdateClanRequest{}
		if name != "" {
			req.Name = &name
		}
		if description != "" {
			req.Description = &description
		}
		if icon != "" {
			req.Icon = &icon
		}
		if tag != "" {
			req.Tag = &tag
		}

		err = h.apiClient.UpdateClan(r.Context(), token, clanID, req)
		if err != nil {
			if apiErr, ok := err.(*api.APIError); ok {
				h.addMessage(sess, models.NewError(apiErr.Code))
			} else {
				h.addMessage(sess, models.NewError("An unexpected error occurred."))
			}
			sess.Save(r, w)
			http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
			return
		}
	} else {
		_, err = h.apiClient.GenerateClanInvite(r.Context(), token, clanID)
		if err != nil {
			if apiErr, ok := err.(*api.APIError); ok {
				h.addMessage(sess, models.NewError(apiErr.Code))
			} else {
				h.addMessage(sess, models.NewError("An unexpected error occurred."))
			}
			sess.Save(r, w)
			http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
			return
		}
	}

	h.addMessage(sess, models.NewSuccess("Settings saved successfully."))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
}

func (h *ClanHandler) createResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	h.templates.Render(w, "clans/create.html", &response.TemplateData{
		TitleBar:  "Create your clan",
		KyutGrill: "clans.jpg",
		Scripts:   []string{"https://js.hcaptcha.com/1/api.js"},
		Messages:  messages,
		FormData:  NormaliseURLValues(r.PostForm),
		Context:   reqCtx,
	})
}

func (h *ClanHandler) redirectToLogin(w http.ResponseWriter, r *http.Request) {
	RedirectToLogin(w, r, h.store)
}

func (h *ClanHandler) addMessage(sess *sessions.Session, msg models.Message) {
	AddMessage(sess, msg)
}
