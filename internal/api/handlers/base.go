package handlers

import (
	"net/http"
	"net/url"

	"github.com/RealistikOsu/soumetsu/internal/api/middleware"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/gorilla/sessions"
)

// BaseHandler provides shared functionality for all handlers
type BaseHandler struct {
	Store middleware.SessionStore
}

// NewBaseHandler creates a new BaseHandler
func NewBaseHandler(store middleware.SessionStore) *BaseHandler {
	return &BaseHandler{Store: store}
}

// AddMessage adds a flash message to the session
// This is a shared utility to avoid code duplication across handlers
func AddMessage(sess *sessions.Session, msg models.Message) {
	messages, _ := sess.Values["messages"].([]models.Message)
	sess.Values["messages"] = append(messages, msg)
}

// AddMessageToSession is a helper that gets the session and adds a message
func (h *BaseHandler) AddMessageToSession(r *http.Request, w http.ResponseWriter, msg models.Message) error {
	sess, err := h.Store.Get(r, "session")
	if err != nil {
		return err
	}
	AddMessage(sess, msg)
	return sess.Save(r, w)
}

// RedirectToLogin redirects the user to the login page with a message
// and preserves the original URL for redirect after login
func RedirectToLogin(w http.ResponseWriter, r *http.Request, store middleware.SessionStore) {
	sess, err := store.Get(r, "session")
	if err == nil {
		AddMessage(sess, models.NewWarning("You need to login first."))
		sess.Save(r, w)
	}
	http.Redirect(w, r, "/login?redir="+url.QueryEscape(r.URL.Path), http.StatusFound)
}

// RedirectWithMessage redirects to a URL with a flash message
func RedirectWithMessage(w http.ResponseWriter, r *http.Request, store middleware.SessionStore, redirectURL string, msg models.Message) {
	sess, err := store.Get(r, "session")
	if err == nil {
		AddMessage(sess, msg)
		sess.Save(r, w)
	}
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// GetMessages retrieves and clears flash messages from the session
func GetMessages(sess *sessions.Session) []models.Message {
	messages, _ := sess.Values["messages"].([]models.Message)
	sess.Values["messages"] = nil
	return messages
}

// NormaliseURLValues converts url.Values to a map for template use
// This is commonly used across handlers for form data
func NormaliseURLValues(uv url.Values) map[string][]string {
	if uv == nil {
		return nil
	}
	return map[string][]string(uv)
}
