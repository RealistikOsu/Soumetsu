package middleware

import (
	"database/sql"
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/gorilla/sessions"
)

type SessionStore interface {
	Get(r *http.Request, name string) (*sessions.Session, error)
}

func SessionInitializer(store SessionStore, db *mysql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			sess, err := store.Get(r, "session")
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			reqCtx := &apicontext.RequestContext{}

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

			var userData struct {
				Username   string `db:"username"`
				Privileges int64  `db:"privileges"`
				Flags      uint64 `db:"flags"`
				Password   string `db:"password_md5"`
				Coins      int    `db:"coins"`
			}

			err = db.QueryRowContext(r.Context(), `
				SELECT username, privileges, flags, password_md5, coins
				FROM users WHERE id = ?`, userID).Scan(
				&userData.Username, &userData.Privileges, &userData.Flags, &userData.Password, &userData.Coins)

			if err == sql.ErrNoRows {
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

			pwVal := sess.Values["pw"]
			if pwVal != nil {
				// Use SHA-256 for session validation (more secure than MD5)
				if pw, ok := pwVal.(string); ok && pw != crypto.HashSessionToken(userData.Password) {
					sess.Values["userid"] = nil
					sess.Save(r, w)
					ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			if models.UserPrivileges(userData.Privileges)&1 == 0 {
				sess.Values["userid"] = nil
				sess.Save(r, w)
				ctx := apicontext.WithRequestContext(r.Context(), reqCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}

			var clanID, clanOwner int
			err = db.QueryRowContext(r.Context(), `
				SELECT clan, perms = 8 FROM user_clans WHERE user = ?`, userID).Scan(&clanID, &clanOwner)
			if err != nil {
				clanID = 0
				clanOwner = 0
			}

			reqCtx.User = models.SessionUser{
				ID:         userID,
				Username:   userData.Username,
				Privileges: models.UserPrivileges(userData.Privileges),
				Flags:      userData.Flags,
				Clan:       clanID,
				ClanOwner:  clanOwner,
				Coins:      userData.Coins,
			}

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

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqCtx := apicontext.GetRequestContextFromRequest(r)
		if reqCtx.User.ID == 0 {
			http.Error(w, "Unauthorised", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

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
