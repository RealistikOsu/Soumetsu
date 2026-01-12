package context

import (
	"context"
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/models"
)

type contextKey string

const (
	sessionKey contextKey = "session"
	userKey    contextKey = "user"
	tokenKey   contextKey = "token"
)

type RequestContext struct {
	User  models.SessionUser
	Token string
}

func WithRequestContext(ctx context.Context, reqCtx *RequestContext) context.Context {
	return context.WithValue(ctx, sessionKey, reqCtx)
}

func GetRequestContext(ctx context.Context) *RequestContext {
	if v := ctx.Value(sessionKey); v != nil {
		return v.(*RequestContext)
	}
	return &RequestContext{}
}

func GetRequestContextFromRequest(r *http.Request) *RequestContext {
	return GetRequestContext(r.Context())
}

func IsLoggedIn(ctx context.Context) bool {
	reqCtx := GetRequestContext(ctx)
	return reqCtx.User.ID != 0
}

func GetUserID(ctx context.Context) int {
	reqCtx := GetRequestContext(ctx)
	return reqCtx.User.ID
}

func GetUser(ctx context.Context) models.SessionUser {
	reqCtx := GetRequestContext(ctx)
	return reqCtx.User
}

func ClientIP(r *http.Request) string {
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return ip
	}
	return r.RemoteAddr
}
