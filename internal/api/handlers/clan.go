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

type ClanHandler struct {
	config      *config.Config
	clanService *clan.Service
	csrf        middleware.CSRFService
	store       middleware.SessionStore
	templates   *response.TemplateEngine
	db          *mysql.DB
}

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

type ClanPageData struct {
	ClanID    int
	ClanParam string
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

	inviteCode := chi.URLParam(r, "inv")

	clanID, err := h.clanService.Join(r.Context(), reqCtx.User.ID, inviteCode)
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

	h.addMessage(sess, models.NewSuccess("You have joined the clan."))
	sess.Save(r, w)
	http.Redirect(w, r, "/clans/"+strconv.Itoa(clanID), http.StatusFound)
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

	name := r.FormValue("name")
	description := r.FormValue("description")
	icon := r.FormValue("icon")
	tag := r.FormValue("tag")

	if name != "" || description != "" || icon != "" || tag != "" {
		input := clan.UpdateInput{
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

	h.addMessage(sess, models.NewSuccess("Settings saved successfully."))
	sess.Save(r, w)
	http.Redirect(w, r, "/settings/clans/manage", http.StatusFound)
}

func (h *ClanHandler) createResp(w http.ResponseWriter, r *http.Request, messages ...models.Message) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	h.templates.Render(w, "clans/create.html", &response.TemplateData{
		TitleBar:  "Create your clan",
		KyutGrill: "clans.jpg",
		Scripts:   []string{"https://www.google.com/recaptcha/api.js"},
		Messages:  messages,
		FormData:  NormaliseURLValues(r.PostForm),
		Context:   reqCtx,
	})
}

func (h *ClanHandler) redirectToLogin(w http.ResponseWriter, r *http.Request) {
	RedirectToLogin(w, r, h.store) // Use shared implementation
}

func (h *ClanHandler) addMessage(sess *sessions.Session, msg models.Message) {
	AddMessage(sess, msg) // Use shared implementation
}
