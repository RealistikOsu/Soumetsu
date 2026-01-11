package handlers

import (
	"log/slog"
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/api/response"
)

// ErrorsHandler handles error page requests.
type ErrorsHandler struct {
	templates *response.TemplateEngine
}

// NewErrorsHandler creates a new errors handler.
func NewErrorsHandler(templates *response.TemplateEngine) *ErrorsHandler {
	return &ErrorsHandler{
		templates: templates,
	}
}

// NotFound handles 404 errors.
func (h *ErrorsHandler) NotFound(w http.ResponseWriter, r *http.Request) {
	h.templates.NotFound(w, r)
}

// InternalError handles 500 errors.
func (h *ErrorsHandler) InternalError(w http.ResponseWriter, r *http.Request, err error) {
	if err != nil {
		slog.Error("Internal server error", "error", err, "path", r.URL.Path)
	}
	h.templates.InternalError(w, r, err)
}

// Forbidden handles 403 errors.
func (h *ErrorsHandler) Forbidden(w http.ResponseWriter, r *http.Request) {
	h.templates.Forbidden(w, r)
}

// MethodNotAllowed handles 405 errors.
func (h *ErrorsHandler) MethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusMethodNotAllowed)
	h.templates.Render(w, "empty.html", &response.TemplateData{
		TitleBar: "Method Not Allowed",
	})
}

// Recoverer returns a middleware that recovers from panics.
func (h *ErrorsHandler) Recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				slog.Error("Panic recovered",
					"panic", rec,
					"path", r.URL.Path,
					"method", r.Method,
				)
				h.templates.InternalError(w, r, nil)
			}
		}()
		next.ServeHTTP(w, r)
	})
}
