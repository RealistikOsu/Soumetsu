package handlers

import (
	"log/slog"
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/api/response"
)

type ErrorsHandler struct {
	templates *response.TemplateEngine
}

func NewErrorsHandler(templates *response.TemplateEngine) *ErrorsHandler {
	return &ErrorsHandler{
		templates: templates,
	}
}

func (h *ErrorsHandler) NotFound(w http.ResponseWriter, r *http.Request) {
	h.templates.NotFound(w, r)
}

func (h *ErrorsHandler) InternalError(w http.ResponseWriter, r *http.Request, err error) {
	if err != nil {
		slog.Error("Internal server error", "error", err, "path", r.URL.Path)
	}
	h.templates.InternalError(w, r, err)
}

func (h *ErrorsHandler) Forbidden(w http.ResponseWriter, r *http.Request) {
	h.templates.Forbidden(w, r)
}

func (h *ErrorsHandler) MethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusMethodNotAllowed)
	h.templates.Render(w, "errors/error_empty.html", &response.TemplateData{
		TitleBar: "Method Not Allowed",
	})
}

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
