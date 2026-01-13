package app

import (
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/api/handlers"
	apimiddleware "github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func (a *App) Routes() chi.Router {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(apimiddleware.StructuredLogger())
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))
	r.Use(a.ErrorsHandler.Recoverer)
	r.Use(sessionsMiddleware(a.SessionStore))
	r.Use(apimiddleware.SessionInitializer(a.SessionStore, a.DB))
	r.Use(a.RateLimiter.Middleware())

	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("web/static"))))
	r.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/static/favicon.ico")
	})

	r.Get("/", a.PagesHandler.HomePage)

	r.Group(func(r chi.Router) {
		r.Use(apimiddleware.RequireGuest)
		r.Get("/login", a.AuthHandler.LoginPage)
		r.Post("/login", a.AuthHandler.Login)
		r.Get("/register", a.AuthHandler.RegisterPage)
		r.Post("/register", a.AuthHandler.Register)
		r.Get("/register/verify", a.AuthHandler.VerifyAccountPage)
		r.Get("/register/welcome", a.AuthHandler.WelcomePage)
	})

	r.Get("/logout", a.AuthHandler.Logout)

	r.Group(func(r chi.Router) {
		r.Use(apimiddleware.RequireAuth)

		r.Get("/settings", a.UserHandler.SettingsPage)
		r.Get("/settings/password", a.PasswordHandler.ChangePage)
		r.Post("/settings/password", a.PasswordHandler.Change)
		r.Get("/settings/avatar", a.UserHandler.AvatarPage)
		r.Post("/settings/avatar", a.UserHandler.UploadAvatar)
		r.Get("/settings/profile-banner", a.UserHandler.ProfileBackgroundPage)
		r.Post("/settings/profile-banner/{type}", a.UserHandler.SetProfileBackground)
		r.Post("/settings/change-username", a.UserHandler.ChangeUsername)
		r.Get("/settings/discord", a.UserHandler.DiscordPage)
		r.Get("/settings/discord/unlink", a.UserHandler.UnlinkDiscord)

		r.Get("/settings/user-page", a.UserHandler.UserpageSettingsPage)
		r.Post("/settings/user-page", a.UserHandler.UpdateUserpage)

		r.Post("/settings/profbanner/{type}", func(w http.ResponseWriter, r *http.Request) {
			routeType := chi.URLParam(r, "type")
			http.Redirect(w, r, "/settings/profile-banner/"+routeType, http.StatusTemporaryRedirect)
		})
		r.Get("/settings/discord-integration/unlink", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/settings/discord/unlink", http.StatusMovedPermanently)
		})
		r.Get("/settings/discord-integration/redirect", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/settings/discord/redirect", http.StatusMovedPermanently)
		})

		r.Get("/clans/create", a.ClanHandler.CreatePage)
		r.Post("/clans/create", a.ClanHandler.Create)
		r.Post("/clans/{id}/leave", a.ClanHandler.Leave)
		r.Post("/clans/{id}/disband", a.ClanHandler.Disband)
		r.Post("/settings/clans/invite", a.ClanHandler.UpdateClan)
		r.Post("/settings/clans/kick", a.ClanHandler.Kick)
		r.Get("/settings/clans/manage", a.ClanHandler.ManagePage)
		r.Post("/settings/clans/manage", a.ClanHandler.UpdateClan)

		r.Post("/settings/clan", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/settings/clans/invite", http.StatusTemporaryRedirect)
		})
		r.Post("/settings/clansettings/k", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/settings/clans/kick", http.StatusTemporaryRedirect)
		})
	})

	r.Get("/clans/{id}", a.ClanHandler.ClanPage)
	r.Get("/clans/invites/{inv}", a.ClanHandler.JoinInvite)

	r.Get("/c/{cid}", func(w http.ResponseWriter, r *http.Request) {
		cid := chi.URLParam(r, "cid")
		http.Redirect(w, r, "/clans/"+cid, http.StatusMovedPermanently)
	})
	r.Post("/c/{cid}", func(w http.ResponseWriter, r *http.Request) {
		cid := chi.URLParam(r, "cid")
		http.Redirect(w, r, "/clans/"+cid+"/leave", http.StatusTemporaryRedirect)
	})
	r.Get("/clans/invite/{inv}", func(w http.ResponseWriter, r *http.Request) {
		inv := chi.URLParam(r, "inv")
		http.Redirect(w, r, "/clans/invites/"+inv, http.StatusMovedPermanently)
	})

	r.Get("/u/{id}", a.UserHandler.Profile)
	r.Get("/users/{id}", a.UserHandler.Profile)

	r.Get("/rx/u/{user}", func(w http.ResponseWriter, r *http.Request) {
		user := chi.URLParam(r, "user")
		http.Redirect(w, r, "/u/"+user+"?rx=1", http.StatusMovedPermanently)
	})
	r.Get("/ap/u/{user}", func(w http.ResponseWriter, r *http.Request) {
		user := chi.URLParam(r, "user")
		http.Redirect(w, r, "/u/"+user+"?rx=2", http.StatusMovedPermanently)
	})

	r.Get("/team", a.UserHandler.TeamPage)

	// Load simple pages first so specific routes like /beatmaps/rank-request
	// are registered before the wildcard /beatmaps/{id} route
	a.loadSimplePages(r)

	r.Get("/b/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		http.Redirect(w, r, "/beatmaps/"+id, http.StatusMovedPermanently)
	})
	r.Get("/beatmaps/{id}", a.BeatmapHandler.BeatmapPage)
	r.Get("/beatmapsets/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		http.Redirect(w, r, "/beatmaps/"+id, http.StatusMovedPermanently)
	})
	r.Get("/beatmapsets/{id}/download", a.BeatmapHandler.DownloadBeatmap)

	r.Get("/rank_request", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/beatmaps/rank-request", http.StatusMovedPermanently)
	})
	r.Get("/rank-request", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/beatmaps/rank-request", http.StatusMovedPermanently)
	})
	r.Get("/clanboard", func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.RawQuery
		if query != "" {
			http.Redirect(w, r, "/clans/leaderboard?"+query, http.StatusMovedPermanently)
		} else {
			http.Redirect(w, r, "/clans/leaderboard", http.StatusMovedPermanently)
		}
	})
	r.Get("/beatmap_listing", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/beatmaps", http.StatusMovedPermanently)
	})
	r.Get("/connect", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/connection", http.StatusMovedPermanently)
	})
	r.Get("/clan/manage", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/settings/clans/manage", http.StatusMovedPermanently)
	})
	r.Get("/help", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, a.Config.Discord.ServerURL, http.StatusMovedPermanently)
	})
	r.Get("/discord", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, a.Config.Discord.ServerURL, http.StatusMovedPermanently)
	})

	r.NotFound(a.ErrorsHandler.NotFound)
	r.MethodNotAllowed(a.ErrorsHandler.MethodNotAllowed)

	return r
}

func (a *App) loadSimplePages(r chi.Router) {
	simplePages := a.TemplateEngine.GetSimplePages()
	for _, sp := range simplePages {
		if sp.Handler == "" {
			continue
		}

		page := handlers.PageConfig{
			Handler:        sp.Handler,
			Template:       sp.Template,
			TitleBar:       sp.TitleBar,
			KyutGrill:      sp.KyutGrill,
			MinPrivileges:  models.UserPrivileges(sp.MinPrivileges),
			Scripts:        parseAdditionalJS(sp.AdditionalJS),
			HeadingOnRight: sp.HugeHeadingRight,
		}

		handler := a.PagesHandler.SimplePage(
			page.Template,
			page.TitleBar,
			page.KyutGrill,
			page.Scripts,
			page.HeadingOnRight,
			page.MinPrivileges,
		)

		if page.MinPrivileges > 0 {
			r.Group(func(r chi.Router) {
				r.Use(apimiddleware.RequireAuth)
				r.Get(page.Handler, handler)
			})
		} else {
			r.Get(page.Handler, handler)
		}
	}
}

func sessionsMiddleware(store apimiddleware.SessionStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			next.ServeHTTP(w, r)
		})
	}
}
