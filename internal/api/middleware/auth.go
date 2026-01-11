// Package middleware provides HTTP middleware for the API.
package middleware

import (
	"database/sql"
	"net/http"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/gorilla/sessions"
)

// SessionStore is the session store interface.
type SessionStore interface {
	Get(r *http.Request, name string) (*sessions.Session, error)
}

// SessionInitializer creates middleware that initializes user sessions.
func SessionInitializer(store SessionStore, db *mysql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sess, err := store.Get(r, "session")
			if err != nil {
				// Session error, continue with empty context
				next.ServeHTTP(w, r)
				return
			}

			reqCtx := &apicontext.RequestContext{}

			// Get user ID from session
			userIDVal := sess.Values["userid"]
			if userIDVal == nil {
				ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			userID, ok := userIDVal.(int)
			if !ok || userID == 0 {
				ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Load user from database
			var userData struct {
				Username   string                `db:"username"`
				Privileges int64                 `db:"privileges"`
				Flags      uint64                `db:"flags"`
				Password   string                `db:"password_md5"`
				Coins      int                   `db:"coins"`
			}

			err = db.QueryRowContext(r.Context(), `
				SELECT username, privileges, flags, password_md5, coins
				FROM users WHERE id = ?`, userID).Scan(
				&userData.Username, &userData.Privileges, &userData.Flags, &userData.Password, &userData.Coins)

			if err == sql.ErrNoRows {
				// User not found, clear session
				sess.Values["userid"] = nil
				sess.Save(r, w)
				ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			if err != nil {
				ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Check password hasn't changed
			pwVal := sess.Values["pw"]
			if pwVal != nil {
				if pw, ok := pwVal.(string); ok && pw != crypto.MD5(userData.Password) {
					// Password changed, clear session
					sess.Values["userid"] = nil
					sess.Save(r, w)
					ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			// Check if user is banned
			if common.UserPrivileges(userData.Privileges)&1 == 0 {
				sess.Values["userid"] = nil
				sess.Save(r, w)
				ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			// Load clan membership
			var clanID, clanOwner int
			err = db.QueryRowContext(r.Context(), `
				SELECT clan, perms = 8 FROM user_clans WHERE user = ?`, userID).Scan(&clanID, &clanOwner)
			if err != nil {
				clanID = 0
				clanOwner = 0
			}

			// Build session user
			reqCtx.User = models.SessionUser{
				ID:         userID,
				Username:   userData.Username,
				Privileges: common.UserPrivileges(userData.Privileges),
				Flags:      userData.Flags,
				Clan:       clanID,
				ClanOwner:  clanOwner,
				Coins:      userData.Coins,
			}

			// Get token from session
			if tokenVal := sess.Values["token"]; tokenVal != nil {
				if token, ok := tokenVal.(string); ok {
					reqCtx.Token = token
				}
			}

			ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAuth middleware ensures the user is authenticated.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqCtx := apicontext.GetRequestContextFromRequest(r)
		if reqCtx.User.ID == 0 {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequireGuest middleware ensures the user is NOT authenticated.
func RequireGuest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqCtx := apicontext.GetRequestContextFromRequest(r)
		if reqCtx.User.ID != 0 {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}
		next.ServeHTTP(w, r)
	})
}
