package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
)

const activityUpdateInterval = 60 // seconds

func ActivityTracker(store SessionStore, db *mysql.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqCtx := apicontext.GetRequestContextFromRequest(r)
			if reqCtx.User.ID == 0 {
				next.ServeHTTP(w, r)
				return
			}

			sess, err := store.Get(r, "session")
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			now := time.Now().Unix()
			lastActivity, _ := sess.Values["last_activity_update"].(int64)

			if now-lastActivity >= activityUpdateInterval {
				_, err := db.ExecContext(r.Context(), "UPDATE users SET latest_activity = ? WHERE id = ?", now, reqCtx.User.ID)
				if err != nil {
					slog.Error("failed to update latest activity", "error", err, "user_id", reqCtx.User.ID)
				} else {
					sess.Values["last_activity_update"] = now
					sess.Save(r, w)
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
