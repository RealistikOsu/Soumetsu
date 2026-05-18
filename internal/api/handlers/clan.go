package handlers

import (
	"net/http"
	"strconv"
	"strings"

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

	sess, _ := h.store.Get(r, "session")

	if err := r.ParseMultipartForm(2 << 20); err != nil {
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

	if iconFile, iconHeader, iconErr := r.FormFile("icon"); iconErr == nil {
		defer iconFile.Close()
		_, upErr := h.apiClient.UploadClanIcon(r.Context(), token, clan.ID, iconHeader.Filename, iconFile, iconHeader.Header.Get("Content-Type"))
		if upErr != nil {
			if apiErr, ok := upErr.(*api.APIError); ok {
				h.addMessage(sess, models.NewWarning("Clan created, but icon upload failed: "+apiErr.Code))
			} else {
				h.addMessage(sess, models.NewWarning("Clan created, but icon upload failed."))
			}
		}
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

	sess, _ := h.store.Get(r, "session")

	token, _ := sess.Values["token"].(string)
	clanIDStr := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanIDStr)

	err := h.apiClient.LeaveClan(r.Context(), token, clanID)
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

	sess, _ := h.store.Get(r, "session")

	token, _ := sess.Values["token"].(string)
	clanIDStr := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanIDStr)

	err := h.apiClient.DeleteClan(r.Context(), token, clanID)
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

	sess, _ := h.store.Get(r, "session")

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

// ManagePage renders the clan settings shell at /clans/{id}/settings.
// All mutations on this page happen client-side via clan-settings.js, so this
// handler only loads data and gates access — non-owners get a 403.
func (h *ClanHandler) ManagePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	clanID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || clanID <= 0 {
		h.templates.NotFound(w, r)
		return
	}

	if reqCtx.User.Clan != clanID || reqCtx.User.ClanOwner == 0 {
		h.templates.Forbidden(w, r)
		return
	}

	sess, _ := h.store.Get(r, "session")
	token, _ := sess.Values["token"].(string)

	clan, err := h.apiClient.GetClan(r.Context(), clanID)
	if err != nil || clan == nil {
		h.templates.NotFound(w, r)
		return
	}

	var inviteCode string
	if invite, err := h.apiClient.GetClanInvite(r.Context(), token, clanID); err == nil && invite != nil {
		inviteCode = invite.InviteCode
	}

	inviteURL := ""
	if inviteCode != "" {
		inviteURL = strings.TrimRight(h.config.App.BaseURL, "/") + "/clans/invites/" + inviteCode
	}

	members, _ := h.apiClient.GetClanMembers(r.Context(), clanID, 1, 100)

	h.templates.RenderWithRequest(w, r, "clans/clan_settings.html", &response.TemplateData{
		TitleBar: "Manage " + clan.Name,
		Context:  reqCtx,
		Extra: map[string]interface{}{
			"Clan":       clan,
			"InviteURL":  inviteURL,
			"InviteCode": inviteCode,
			"Members":    members,
		},
	})
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
