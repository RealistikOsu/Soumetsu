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
	"github.com/RealistikOsu/soumetsu/internal/services/clan"
	"github.com/gorilla/sessions"
)

// ClanHandler handles clan-related requests.
type ClanHandler struct {
	config      *config.Config
	clanService *clan.Service
	csrf        middleware.CSRFService
	store       middleware.SessionStore
	templates   *response.TemplateEngine
	db          *mysql.DB
}

// NewClanHandler creates a new clan handler.
func NewClanHandler(
	cfg *config.Config,
	clanService *clan.Service,
	csrf middleware.CSRFService,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
	db *mysql.DB,
) *ClanHandler {
	return &ClanHandler{
		config:      cfg,
		clanService: clanService,
		csrf:        csrf,
		store:       store,
		templates:   templates,
		db:          db,
	}
}

// ClanPageData contains data for the clan page.
type ClanPageData struct {
	ClanID    int
	ClanParam string
}

// ClanPage renders a clan page.
func (h *ClanHandler) ClanPage(w http.ResponseWriter, r *http.Request) {
	clanParam := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanParam)

	h.templates.Render(w, "clansample.html", &response.TemplateData{
		TitleBar:  "Clan",
		DisableHH: true,
		Context: ClanPageData{
			ClanID:    clanID,
			ClanParam: clanParam,
		},
	})
}

// CreatePage renders the clan creation page.
func (h *ClanHandler) CreatePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.createResp(w, r)
}

// Create handles clan creation form submission.
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

	input := clan.CreateInput{
		Name:        r.FormValue("name"),
		Description: r.FormValue("description"),
		Icon:        r.FormValue("icon"),
		Tag:         r.FormValue("tag"),
		OwnerID:     reqCtx.User.ID,
	}

	clanID, err := h.clanService.Create(r.Context(), input)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.createResp(w, r, models.NewError(svcErr.Message))
			return
		}
		h.templates.InternalError(w, r, err)
		return
	}

	h.addMessage(sess, models.NewSuccess("Clan created."))
	sess.Save(r, w)
	http.Redirect(w, r, "/clans/"+strconv.FormatInt(clanID, 10), http.StatusFound)
}

// Leave handles leaving a clan.
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

	clanIDStr := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanIDStr)

	err = h.clanService.Leave(r.Context(), reqCtx.User.ID, clanID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
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

// Disband handles disbanding a clan (owner only).
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

	clanIDStr := chi.URLParam(r, "id")
	clanID, _ := strconv.Atoi(clanIDStr)

	err = h.clanService.Disband(r.Context(), reqCtx.User.ID, clanID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
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

// JoinInvite handles joining a clan via invite link.
func (h *ClanHandler) JoinInvite(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.templates.Forbidden(w, r)
		return
	}

	// Check if banned
	if reqCtx.User.Privileges&1 != 1 {
		h.templates.Forbidden(w, r)
		return
	}

	sess, err := h.store.Get(r, "session")
	if err != nil {
		h.templates.InternalError(w, r, err)
		return
	}

	inviteCode := chi.URLParam(r, "inv")

	clanID, err := h.clanService.ResolveInvite(r.Context(), inviteCode)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
		} else {
			h.addMessage(sess, models.NewError("NO!!!"))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}
	if clanID == 0 {
		h.addMessage(sess, models.NewError("Invalid invite code."))
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	err = h.clanService.Join(r.Context(), reqCtx.User.ID, inviteCode)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
		} else {
			h.addMessage(sess, models.NewError("NO!!!"))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("You've joined the clan! Hooray!! \\(^o^)/"))
	sess.Save(r, w)
	http.Redirect(w, r, "/clans/"+strconv.Itoa(clanID), http.StatusFound)
}

// Kick handles kicking a member from a clan.
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

	memberID, _ := strconv.Atoi(r.FormValue("member"))

	err = h.clanService.Kick(r.Context(), reqCtx.User.ID, memberID)
	if err != nil {
		if svcErr, ok := err.(*services.ServiceError); ok {
			h.addMessage(sess, models.NewError(svcErr.Message))
		} else {
			h.addMessage(sess, models.NewError("An unexpected error occurred."))
		}
		sess.Save(r, w)
		http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
		return
	}

	h.addMessage(sess, models.NewSuccess("Success!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
}

// ManagePage renders the clan management page.
func (h *ClanHandler) ManagePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		h.redirectToLogin(w, r)
		return
	}

	h.templates.Render(w, "settings/clans/manage.html", &response.TemplateData{
		TitleBar: "Manage Clan",
	})
}

// UpdateClan handles clan settings update (and invite generation).
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

	// Check if this is an update or just invite generation
	name := r.FormValue("name")
	description := r.FormValue("description")
	icon := r.FormValue("icon")
	tag := r.FormValue("tag")

	if name != "" || description != "" || icon != "" || tag != "" {
		// Update clan settings
		input := clan.UpdateInput{
			ClanID:      reqCtx.User.Clan,
			Name:        name,
			Description: description,
			Icon:        icon,
			Tag:         tag,
			RequesterID: reqCtx.User.ID,
		}

		err = h.clanService.Update(r.Context(), input)
		if err != nil {
			if svcErr, ok := err.(*services.ServiceError); ok {
				h.addMessage(sess, models.NewError(svcErr.Message))
			} else {
				h.addMessage(sess, models.NewError("An unexpected error occurred."))
			}
			sess.Save(r, w)
			http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
			return
		}
	} else {
		// Generate new invite
		_, err = h.clanService.CreateInvite(r.Context(), reqCtx.User.ID)
		if err != nil {
			if svcErr, ok := err.(*services.ServiceError); ok {
				h.addMessage(sess, models.NewError(svcErr.Message))
			} else {
				h.addMessage(sess, models.NewError("An unexpected error occurred."))
			}
			sess.Save(r, w)
			http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
			return
		}
	}

	h.addMessage(sess, models.NewSuccess("Success!"))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
}

// Helper methods

func (h *ClanHandler) createResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	h.templates.Render(w, "clans/create.html", &response.TemplateData{
		TitleBar:  "Create your clan",
		KyutGrill: "clans.jpg",
		Scripts:   []string{"https://www.google.com/recaptcha/api.js"},
		Messages:  messages,
		FormData:  normaliseURLValues(r.PostForm),
	})
}

func (h *ClanHandler) redirectToLogin(w http.ResponseWriter, r *http.Request) {
	sess, _ := h.store.Get(r, "session")
	h.addMessage(sess, models.NewWarning("You need to login first."))
	sess.Save(r, w)
	http.Redirect(w, r, "/login?redir="+r.URL.Path, http.StatusFound)
}

func (h *ClanHandler) addMessage(sess *sessions.Session, msg models.Message) {
	messages, _ := sess.Values["messages"].([]models.Message)
	sess.Values["messages"] = append(messages, msg)
}
