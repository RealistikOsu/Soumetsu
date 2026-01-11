// Package app provides the main application structure and initialization.
package app

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/RealistikOsu/soumetsu/internal/adapters/mail"
	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	"github.com/RealistikOsu/soumetsu/internal/api/handlers"
	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/pkg/doc"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
	"github.com/RealistikOsu/soumetsu/internal/services/auth"
	"github.com/RealistikOsu/soumetsu/internal/services/beatmap"
	"github.com/RealistikOsu/soumetsu/internal/services/clan"
	"github.com/RealistikOsu/soumetsu/internal/services/user"
	"github.com/RealistikOsu/soumetsu/web/templates"
	"github.com/boj/redistore"
	"github.com/gorilla/sessions"
)

// App represents the main application with all dependencies.
type App struct {
	Config *config.Config

	// Adapters
	DB    *mysql.DB
	Redis *redis.Client
	Mail  *mail.Client

	// Repositories
	UserRepo             *repositories.UserRepository
	ClanRepo             *repositories.ClanRepository
	TokenRepo            *repositories.TokenRepository
	StatsRepo            *repositories.StatsRepository
	SystemRepo           *repositories.SystemRepository
	DiscordRepo          *repositories.DiscordRepository
	ProfileBackgroundRepo *repositories.ProfileBackgroundRepository

	// Services
	AuthService    *auth.Service
	UserService    *user.Service
	ClanService    *clan.Service
	BeatmapService *beatmap.Service

	// Middleware
	CSRF        middleware.CSRFService
	SessionStore middleware.SessionStore
	RateLimiter *middleware.RateLimiter

	// Templates
	TemplateEngine *templates.Engine
	ResponseEngine *response.TemplateEngine

	// Handlers
	AuthHandler     *handlers.AuthHandler
	UserHandler     *handlers.UserHandler
	PasswordHandler *handlers.PasswordHandler
	ClanHandler     *handlers.ClanHandler
	BeatmapHandler  *handlers.BeatmapHandler
	PagesHandler    *handlers.PagesHandler
	ErrorsHandler   *handlers.ErrorsHandler

	// Doc loader
	DocLoader *doc.Loader
}

// New creates and initializes a new App instance.
func New(cfg *config.Config) (*App, error) {
	app := &App{
		Config: cfg,
	}

	// Initialize adapters
	if err := app.initAdapters(); err != nil {
		return nil, err
	}

	// Initialize repositories
	app.initRepositories()

	// Initialize services
	if err := app.initServices(); err != nil {
		return nil, err
	}

	// Initialize middleware
	if err := app.initMiddleware(); err != nil {
		return nil, err
	}

	// Initialize templates
	if err := app.initTemplates(); err != nil {
		return nil, err
	}

	// Initialize handlers
	app.initHandlers()

	// Initialize doc loader
	app.initDocLoader()

	return app, nil
}

func (a *App) initAdapters() error {
	// Initialize MySQL
	db, err := mysql.New(a.Config.Database)
	if err != nil {
		return err
	}
	a.DB = db

	// Initialize Redis
	redisClient, err := redis.New(a.Config.Redis)
	if err != nil {
		return err
	}
	a.Redis = redisClient

	// Initialize Mailgun
	a.Mail = mail.New(a.Config.Mailgun)

	return nil
}

func (a *App) initRepositories() {
	a.UserRepo = repositories.NewUserRepository(a.DB)
	a.ClanRepo = repositories.NewClanRepository(a.DB)
	a.TokenRepo = repositories.NewTokenRepository(a.DB)
	a.StatsRepo = repositories.NewStatsRepository(a.DB)
	a.SystemRepo = repositories.NewSystemRepository(a.DB)
	a.DiscordRepo = repositories.NewDiscordRepository(a.DB)
	a.ProfileBackgroundRepo = repositories.NewProfileBackgroundRepository(a.DB)
}

func (a *App) initServices() error {
	// Initialize auth service
	a.AuthService = auth.NewService(
		a.Config,
		a.UserRepo,
		a.TokenRepo,
		a.StatsRepo,
		a.SystemRepo,
		a.Mail,
		a.Redis,
	)

	// Initialize user service
	a.UserService = user.NewService(
		a.Config,
		a.UserRepo,
		a.ProfileBackgroundRepo,
		a.DiscordRepo,
		a.Redis,
	)

	// Initialize clan service
	a.ClanService = clan.NewService(
		a.ClanRepo,
		a.Redis,
	)

	// Initialize beatmap service
	a.BeatmapService = beatmap.NewService(
		a.Config,
	)

	return nil
}

func (a *App) initMiddleware() error {
	// Initialize CSRF
	a.CSRF = middleware.NewCSRFService()

	// Initialize session store
	// Try Redis store first, fall back to cookie store
	var store sessions.Store
	var err error

	if a.Config.Redis.Host != "" {
		store, err = redistore.NewRediStore(
			a.Config.Redis.MaxConnections,
			a.Config.Redis.NetworkType,
			a.Config.Redis.Addr(),
			a.Config.Redis.Pass,
			[]byte(a.Config.App.CookieSecret),
		)
		if err != nil {
			slog.Warn("Failed to initialize Redis session store, falling back to cookie store", "error", err)
			store = sessions.NewCookieStore([]byte(a.Config.App.CookieSecret))
		}
	} else {
		store = sessions.NewCookieStore([]byte(a.Config.App.CookieSecret))
	}

	a.SessionStore = &sessionStoreWrapper{store: store}

	// Initialize rate limiter (10 requests per second, capacity of 20)
	a.RateLimiter = middleware.NewRateLimiter(10, 20)

	return nil
}

func (a *App) initTemplates() error {
	// Get templates directory
	templatesDir := "web/templates"
	if _, err := os.Stat(templatesDir); os.IsNotExist(err) {
		// Try relative to current working directory
		wd, _ := os.Getwd()
		templatesDir = filepath.Join(wd, "web", "templates")
	}

	// Create template engine
	funcMap := templates.FuncMap()
	engine := templates.NewEngine(templatesDir, funcMap)

	// Load templates
	if err := engine.Load(); err != nil {
		return err
	}
	a.TemplateEngine = engine

	// Create response engine wrapper
	a.ResponseEngine = response.NewTemplateEngine(engine.GetTemplates(), funcMap)

	return nil
}

func (a *App) initHandlers() {
	// Initialize handlers
	a.AuthHandler = handlers.NewAuthHandler(
		a.Config,
		a.AuthService,
		a.CSRF,
		a.SessionStore,
		a.ResponseEngine,
		a.DB,
		a.Redis,
	)

	a.UserHandler = handlers.NewUserHandler(
		a.Config,
		a.UserService,
		a.CSRF,
		a.SessionStore,
		a.ResponseEngine,
		a.DB,
	)

	a.PasswordHandler = handlers.NewPasswordHandler(
		a.Config,
		a.AuthService,
		a.UserService,
		a.CSRF,
		a.SessionStore,
		a.ResponseEngine,
		a.DB,
	)

	a.ClanHandler = handlers.NewClanHandler(
		a.Config,
		a.ClanService,
		a.CSRF,
		a.SessionStore,
		a.ResponseEngine,
		a.DB,
	)

	a.BeatmapHandler = handlers.NewBeatmapHandler(
		a.Config,
		a.BeatmapService,
		a.ResponseEngine,
	)

	// Convert template configs to page configs
	simplePages := a.TemplateEngine.GetSimplePages()
	pageConfigs := make([]handlers.PageConfig, 0, len(simplePages))
	for _, sp := range simplePages {
		pageConfigs = append(pageConfigs, handlers.PageConfig{
			Handler:        sp.Handler,
			Template:       sp.Template,
			TitleBar:       sp.TitleBar,
			KyutGrill:      sp.KyutGrill,
			MinPrivileges:  common.UserPrivileges(sp.MinPrivileges),
			Scripts:        parseAdditionalJS(sp.AdditionalJS),
			HeadingOnRight: sp.HugeHeadingRight,
		})
	}

	a.PagesHandler = handlers.NewPagesHandler(
		a.Config,
		a.SessionStore,
		a.ResponseEngine,
		pageConfigs,
	)

	a.ErrorsHandler = handlers.NewErrorsHandler(a.ResponseEngine)
}

func (a *App) initDocLoader() {
	docsDir := "website-docs"
	if _, err := os.Stat(docsDir); os.IsNotExist(err) {
		wd, _ := os.Getwd()
		docsDir = filepath.Join(wd, "website-docs")
	}

	a.DocLoader = doc.NewLoader(docsDir)
	if err := a.DocLoader.Load(); err != nil {
		slog.Warn("Failed to load documentation", "error", err)
	}
}

// sessionStoreWrapper wraps gorilla sessions.Store to implement middleware.SessionStore
type sessionStoreWrapper struct {
	store sessions.Store
}

func (w *sessionStoreWrapper) Get(r *http.Request, name string) (*sessions.Session, error) {
	return w.store.Get(r, name)
}

// parseAdditionalJS parses the AdditionalJS field from template config.
func parseAdditionalJS(js string) []string {
	if js == "" {
		return nil
	}
	parts := strings.Split(js, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}
