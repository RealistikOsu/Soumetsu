// Package context provides request context utilities.
package context

import (
	"context"
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/models"
)

// Key types for context values.
type contextKey string

const (
	sessionKey contextKey = "session"
	userKey    contextKey = "user"
	tokenKey   contextKey = "token"
)

// RequestContext holds the current request's context data.
type RequestContext struct {
	User  models.SessionUser
	Token string
}

// WithRequestContext adds a request context to the context.
func WithRequestContext(ctx context.Context, reqCtx *RequestContext) context.Context {
	return context.WithValue(ctx, sessionKey, reqCtx)
}

// GetRequestContext retrieves the request context from the context.
func GetRequestContext(ctx context.Context) *RequestContext {
	if v := ctx.Value(sessionKey); v != nil {
		return v.(*RequestContext)
	}
	return &RequestContext{}
}

// GetRequestContextFromRequest retrieves the request context from an HTTP request.
func GetRequestContextFromRequest(r *http.Request) *RequestContext {
	return GetRequestContext(r.Context())
}

// IsLoggedIn returns true if the user is authenticated.
func IsLoggedIn(ctx context.Context) bool {
	reqCtx := GetRequestContext(ctx)
	return reqCtx.User.ID != 0
}

// GetUserID returns the current user's ID.
func GetUserID(ctx context.Context) int {
	reqCtx := GetRequestContext(ctx)
	return reqCtx.User.ID
}

// GetUser returns the current session user.
func GetUser(ctx context.Context) models.SessionUser {
	reqCtx := GetRequestContext(ctx)
	return reqCtx.User
}

// ClientIP extracts the client IP from the request.
func ClientIP(r *http.Request) string {
	// Check X-Real-IP header first
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	// Check X-Forwarded-For header
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return ip
	}
	// Fall back to RemoteAddr
	return r.RemoteAddr
}
