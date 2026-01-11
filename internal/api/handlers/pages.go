package handlers

import (
	"net/http"
	"net/url"

	"github.com/RealistikOsu/RealistikAPI/common"

	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/gorilla/sessions"
)

// PageConfig represents configuration for a simple page.
type PageConfig struct {
	Handler         string
	Template        string
	TitleBar        string
	KyutGrill       string
	MinPrivileges   common.UserPrivileges
	Scripts         []string
	HeadingOnRight  bool
}

// PagesHandler handles simple static page requests.
type PagesHandler struct {
	config    *config.Config
	store     middleware.SessionStore
	templates *response.TemplateEngine
	pages     []PageConfig
}

// NewPagesHandler creates a new pages handler.
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

// HomePage renders the home page.
func (h *PagesHandler) HomePage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "homepage.html", &response.TemplateData{
		TitleBar: "Home",
		Path:     r.URL.Path,
	})
}

// SimplePage returns a handler for a simple page by template name.
func (h *PagesHandler) SimplePage(templateName, titleBar, kyutGrill string, scripts []string, headingOnRight bool, minPrivileges common.UserPrivileges) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqCtx := apicontext.GetRequestContextFromRequest(r)

		// Check privileges
		if minPrivileges > 0 && reqCtx.User.Privileges&minPrivileges != minPrivileges {
			h.forbidden(w, r)
			return
		}

		h.templates.Render(w, templateName, &response.TemplateData{
			TitleBar:       titleBar,
			KyutGrill:      kyutGrill,
			Scripts:        scripts,
			HeadingOnRight: headingOnRight,
			Path:           r.URL.Path,
			FormData:       normaliseURLValues(r.PostForm),
		})
	}
}

// SimplePageWithMessages renders a simple page with optional messages.
func (h *PagesHandler) SimplePageWithMessages(templateName, titleBar string, messages []models.Message, extra map[string]interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h.templates.Render(w, templateName, &response.TemplateData{
			TitleBar: titleBar,
			Messages: messages,
			Extra:    extra,
			Path:     r.URL.Path,
			FormData: normaliseURLValues(r.PostForm),
		})
	}
}

// RulesPage renders the rules page.
func (h *PagesHandler) RulesPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "rules.html", &response.TemplateData{
		TitleBar: "Rules",
		Path:     r.URL.Path,
	})
}

// AboutPage renders the about page.
func (h *PagesHandler) AboutPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "about.html", &response.TemplateData{
		TitleBar: "About",
		Path:     r.URL.Path,
	})
}

// LeaderboardPage renders the leaderboard page.
func (h *PagesHandler) LeaderboardPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "leaderboard.html", &response.TemplateData{
		TitleBar:  "Leaderboard",
		DisableHH: true,
		Path:      r.URL.Path,
	})
}

// DonorsPage renders the donors page.
func (h *PagesHandler) DonorsPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "donors.html", &response.TemplateData{
		TitleBar: "Donors",
		Path:     r.URL.Path,
	})
}

// ClansListPage renders the clans list page.
func (h *PagesHandler) ClansListPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "clans/list.html", &response.TemplateData{
		TitleBar:  "Clans",
		DisableHH: true,
		Path:      r.URL.Path,
	})
}

// DocPage renders a documentation page.
func (h *PagesHandler) DocPage(w http.ResponseWriter, r *http.Request) {
	h.templates.Render(w, "doc.html", &response.TemplateData{
		TitleBar: "Documentation",
		Path:     r.URL.Path,
	})
}

// EmptyPage renders an empty page with just a title.
func (h *PagesHandler) EmptyPage(titleBar string, messages ...models.Message) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h.templates.Render(w, "empty.html", &response.TemplateData{
			TitleBar: titleBar,
			Messages: messages,
			Path:     r.URL.Path,
		})
	}
}

// Helper methods

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
	messages, _ := sess.Values["messages"].([]models.Message)
	sess.Values["messages"] = append(messages, msg)
}
