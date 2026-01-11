// Package response provides HTTP response utilities.
package response

import (
	"encoding/json"
	"html/template"
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/services"
)

// JSONResponse represents a JSON API response.
type JSONResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// JSON writes a JSON response.
func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// JSONSuccess writes a successful JSON response.
func JSONSuccess(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, JSONResponse{
		Success: true,
		Data:    data,
	})
}

// JSONError writes an error JSON response.
func JSONError(w http.ResponseWriter, statusCode int, message string) {
	JSON(w, statusCode, JSONResponse{
		Success: false,
		Message: message,
	})
}

// Error handles service errors and writes appropriate responses.
func Error(w http.ResponseWriter, err error) {
	if svcErr, ok := err.(*services.ServiceError); ok {
		JSONError(w, svcErr.StatusCode, svcErr.Message)
		return
	}
	JSONError(w, http.StatusInternalServerError, "An unexpected error occurred")
}

// Redirect redirects to a URL.
func Redirect(w http.ResponseWriter, r *http.Request, url string, code int) {
	http.Redirect(w, r, url, code)
}

// TemplateData represents data passed to templates.
type TemplateData struct {
	TitleBar       string
	HeadingTitle   string
	HeadingOnRight bool
	KyutGrill      string
	DisableHH      bool
	Scripts        []string
	Messages       []models.Message
	FormData       map[string][]string
	QueryParams    map[string]string // Query parameters for template access (replaces .Gin.Query)
	Context        interface{}
	Path           string
	Extra          map[string]interface{}
}

// TemplateEngine provides template rendering.
type TemplateEngine struct {
	templates map[string]*template.Template
	funcMap   template.FuncMap
}

// NewTemplateEngine creates a new template engine.
func NewTemplateEngine(templates map[string]*template.Template, funcMap template.FuncMap) *TemplateEngine {
	return &TemplateEngine{
		templates: templates,
		funcMap:   funcMap,
	}
}

// Render renders a template with the given data.
func (e *TemplateEngine) Render(w http.ResponseWriter, name string, data *TemplateData) error {
	tmpl, ok := e.templates[name]
	if !ok {
		http.Error(w, "Template not found", http.StatusInternalServerError)
		return nil
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	return tmpl.Execute(w, data)
}

// RenderWithRequest renders a template and automatically extracts query parameters.
func (e *TemplateEngine) RenderWithRequest(w http.ResponseWriter, r *http.Request, name string, data *TemplateData) error {
	// Extract query parameters
	if data.QueryParams == nil {
		data.QueryParams = make(map[string]string)
	}
	for k, v := range r.URL.Query() {
		if len(v) > 0 {
			data.QueryParams[k] = v[0]
		}
	}
	return e.Render(w, name, data)
}

// NotFound renders a 404 error page.
func (e *TemplateEngine) NotFound(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	data := &TemplateData{
		TitleBar: "Not Found",
	}
	e.Render(w, "404.html", data)
}

// InternalError renders a 500 error page.
func (e *TemplateEngine) InternalError(w http.ResponseWriter, r *http.Request, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	data := &TemplateData{
		TitleBar: "Error",
	}
	e.Render(w, "500.html", data)
}

// Forbidden renders a 403 error page.
func (e *TemplateEngine) Forbidden(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusForbidden)
	data := &TemplateData{
		TitleBar: "Forbidden",
	}
	e.Render(w, "403.html", data)
}

// AddMessage adds a flash message to the session.
// Note: This should be implemented with session storage.
func AddMessage(messages *[]models.Message, msg models.Message) {
	*messages = append(*messages, msg)
}
