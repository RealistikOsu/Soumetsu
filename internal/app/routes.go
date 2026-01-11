// Package app provides route registration.
package app

import (
	"net/http"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/RealistikOsu/soumetsu/internal/api/handlers"
	apimiddleware "github.com/RealistikOsu/soumetsu/internal/api/middleware"
)

// Routes sets up and returns the chi router with all routes registered.
func (a *App) Routes() chi.Router {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(apimiddleware.StructuredLogger())
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))
	r.Use(a.ErrorsHandler.Recoverer)
	r.Use(sessionsMiddleware(a.SessionStore))
	r.Use(apimiddleware.SessionInitializer(a.SessionStore, a.DB))
	r.Use(a.RateLimiter.Middleware())

	// Static files
	r.Handle("/static/*", http.StripPrefix("/static/", http.FileServer(http.Dir("web/static"))))
	r.HandleFunc("/favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "web/static/favicon.ico")
	})

	// Home page
	r.Get("/", a.PagesHandler.HomePage)

	// Auth routes
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

	// Password reset routes
	r.Get("/password-reset", a.PasswordHandler.ResetPage)
	r.Post("/password-reset", a.PasswordHandler.Reset)
	r.Get("/password-reset/continue", a.PasswordHandler.ResetContinuePage)
	r.Post("/password-reset/continue", a.PasswordHandler.ResetContinue)

	// Legacy password reset redirects
	r.Post("/pwreset", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/password-reset", http.StatusTemporaryRedirect)
	})
	r.Get("/pwreset/continue", func(w http.ResponseWriter, r *http.Request) {
		k := r.URL.Query().Get("k")
		if k != "" {
			http.Redirect(w, r, "/password-reset/continue?k="+k, http.StatusMovedPermanently)
		} else {
			http.Redirect(w, r, "/password-reset/continue", http.StatusMovedPermanently)
		}
	})
	r.Post("/pwreset/continue", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/password-reset/continue", http.StatusTemporaryRedirect)
	})

	// Protected routes (require authentication)
	r.Group(func(r chi.Router) {
		r.Use(apimiddleware.RequireAuth)

		// Settings routes
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

		// Legacy settings redirects
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

		// Clan management routes
		r.Get("/clans/create", a.ClanHandler.CreatePage)
		r.Post("/clans/create", a.ClanHandler.Create)
		r.Post("/clans/{id}/leave", a.ClanHandler.Leave)
		r.Post("/clans/{id}/disband", a.ClanHandler.Disband)
		r.Post("/settings/clans/invite", a.ClanHandler.UpdateClan) // CreateInvite is handled by UpdateClan
		r.Post("/settings/clans/kick", a.ClanHandler.Kick)
		r.Get("/settings/clans/manage", a.ClanHandler.ManagePage)
		r.Post("/settings/clans/manage", a.ClanHandler.UpdateClan)

		// Legacy clan route redirects
		r.Post("/settings/clan", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/settings/clans/invite", http.StatusTemporaryRedirect)
		})
		r.Post("/settings/clansettings/k", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/settings/clans/kick", http.StatusTemporaryRedirect)
		})
	})

	// Public clan routes
	r.Get("/clans/{id}", a.ClanHandler.ClanPage)
	r.Get("/clans/invites/{inv}", a.ClanHandler.JoinInvite)

	// Legacy clan route redirects
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

	// User profile routes
	r.Get("/u/{id}", a.UserHandler.Profile)
	r.Get("/users/{id}", a.UserHandler.Profile)

	// Legacy user route redirects
	r.Get("/rx/u/{user}", func(w http.ResponseWriter, r *http.Request) {
		user := chi.URLParam(r, "user")
		http.Redirect(w, r, "/u/"+user+"?rx=1", http.StatusMovedPermanently)
	})
	r.Get("/ap/u/{user}", func(w http.ResponseWriter, r *http.Request) {
		user := chi.URLParam(r, "user")
		http.Redirect(w, r, "/u/"+user+"?rx=2", http.StatusMovedPermanently)
	})

	// Beatmap routes
	r.Get("/b/{id}", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		http.Redirect(w, r, "/beatmaps/"+id, http.StatusMovedPermanently)
	})
	r.Get("/beatmaps/{id}", a.BeatmapHandler.BeatmapPage)
	r.Get("/beatmapsets/{id}", func(w http.ResponseWriter, r *http.Request) {
		// This should redirect to the latest beatmap in the set
		// For now, just redirect to beatmaps
		id := chi.URLParam(r, "id")
		http.Redirect(w, r, "/beatmaps/"+id, http.StatusMovedPermanently)
	})
	r.Get("/beatmapsets/{id}/download", a.BeatmapHandler.DownloadBeatmap)

	// Simple pages (loaded from template configs)
	a.loadSimplePages(r)

	// Legacy route redirects
	r.Get("/rank_request", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/rank-request", http.StatusMovedPermanently)
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

	// 404 handler
	r.NotFound(a.ErrorsHandler.NotFound)
	r.MethodNotAllowed(a.ErrorsHandler.MethodNotAllowed)

	return r
}

// loadSimplePages loads simple pages from template configurations.
func (a *App) loadSimplePages(r chi.Router) {
	// Get pages from template engine
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
			MinPrivileges:  common.UserPrivileges(sp.MinPrivileges),
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

// sessionsMiddleware wraps gorilla sessions for chi.
func sessionsMiddleware(store apimiddleware.SessionStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Session is handled by SessionInitializer middleware
			next.ServeHTTP(w, r)
		})
	}
}
