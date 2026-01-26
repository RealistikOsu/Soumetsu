package handlers

import (
	"net/http"
	"net/url"

	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/gorilla/sessions"
)

type PageConfig struct {
	Handler        string
	Template       string
	TitleBar       string
	KyutGrill      string
	MinPrivileges  models.UserPrivileges
	Scripts        []string
	HeadingOnRight bool
}

type PagesHandler struct {
	config    *config.Config
	store     middleware.SessionStore
	templates *response.TemplateEngine
	pages     []PageConfig
}

func NewPagesHandler(
	cfg *config.Config,
	store middleware.SessionStore,
	templates *response.TemplateEngine,
	pages []PageConfig,
) *PagesHandler {
	return &PagesHandler{
		config:    cfg,
		store:     store,
		templates: templates,
		pages:     pages,
	}
}

func (h *PagesHandler) HomePage(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)

	var sessionWrapper *response.SessionWrapper
	if sess, err := h.store.Get(r, "session"); err == nil {
		sessionWrapper = response.NewSessionWrapper(sess)
	} else {
		sessionWrapper = response.NewSessionWrapper(nil)
	}

	h.templates.Render(w, "home.html", &response.TemplateData{
		TitleBar: "Home",
		Path:     r.URL.Path,
		Context:  reqCtx,
		Session:  sessionWrapper,
	})
}

func (h *PagesHandler) SimplePage(templateName, titleBar, kyutGrill string, scripts []string, headingOnRight bool, minPrivileges models.UserPrivileges) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqCtx := apicontext.GetRequestContextFromRequest(r)

		if minPrivileges > 0 && reqCtx.User.Privileges&minPrivileges != minPrivileges {
			h.forbidden(w, r)
			return
		}

		var sessionWrapper *response.SessionWrapper
		if sess, err := h.store.Get(r, "session"); err == nil {
			sessionWrapper = response.NewSessionWrapper(sess)
		} else {
			sessionWrapper = response.NewSessionWrapper(nil)
		}

		h.templates.Render(w, templateName, &response.TemplateData{
			TitleBar:       titleBar,
			KyutGrill:      kyutGrill,
			Scripts:        scripts,
			HeadingOnRight: headingOnRight,
			Path:           r.URL.Path,
			FormData:       NormaliseURLValues(r.PostForm),
			Context:        reqCtx,
			Session:        sessionWrapper,
		})
	}
}

func (h *PagesHandler) SimplePageWithMessages(templateName, titleBar string, messages []models.Message, extra map[string]interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h.templates.Render(w, templateName, &response.TemplateData{
			TitleBar: titleBar,
			Messages: messages,
			Extra:    extra,
			Path:     r.URL.Path,
			FormData: NormaliseURLValues(r.PostForm),
		})
	}
}

func (h *PagesHandler) RulesPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "rules.html", &response.TemplateData{
		TitleBar: "Rules",
		Path:     r.URL.Path,
	})
}

func (h *PagesHandler) AboutPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "about.html", &response.TemplateData{
		TitleBar: "About",
		Path:     r.URL.Path,
	})
}

func (h *PagesHandler) LeaderboardPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "leaderboard.html", &response.TemplateData{
		TitleBar:  "Leaderboard",
		DisableHH: true,
		Path:      r.URL.Path,
	})
}

func (h *PagesHandler) DonorsPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "donors.html", &response.TemplateData{
		TitleBar: "Donors",
		Path:     r.URL.Path,
	})
}

func (h *PagesHandler) ClansListPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "clans/list.html", &response.TemplateData{
		TitleBar:  "Clans",
		DisableHH: true,
		Path:      r.URL.Path,
	})
}

func (h *PagesHandler) EmptyPage(titleBar string, messages ...models.Message) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
			TitleBar: titleBar,
			Messages: messages,
			Path:     r.URL.Path,
		})
	}
}

func (h *PagesHandler) forbidden(w http.ResponseWriter, r *http.Request) {
	reqCtx := apicontext.GetRequestContextFromRequest(r)
	if reqCtx.User.ID == 0 {
		sess, _ := h.store.Get(r, "session")
		h.addMessage(sess, models.NewWarning("You need to login first."))
		sess.Save(r, w)
		ru := r.URL
		http.Redirect(w, r, "/login?redir="+url.QueryEscape(ru.Path+"?"+ru.RawQuery), http.StatusFound)
		return
	}
	h.templates.Render(w, "empty.html", &response.TemplateData{
		TitleBar: "Forbidden",
		Messages: []models.Message{models.NewWarning("You do not have sufficient privileges to visit this area!")},
	})
}

func (h *PagesHandler) addMessage(sess *sessions.Session, msg models.Message) {
	AddMessage(sess, msg)
}
