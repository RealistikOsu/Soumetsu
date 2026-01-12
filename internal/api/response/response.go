// Package response provides HTTP response utilities.
package response

import (
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"

	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/services"
	"github.com/gorilla/sessions"
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
	Params         map[string]string // Route parameters (replaces .Gin.Param)
	Context        interface{}       // Request context (apicontext.RequestContext)
	Path           string
	Extra          map[string]interface{}
	Conf           interface{}            // Config values (config.Config)
	ClientFlags    int                    // Client flags for user
	Frozen         bool                   // User frozen status (pre-fetched to avoid template queries)
	SystemSettings map[string]interface{} // System settings (pre-fetched to avoid template queries)
	Session        *SessionWrapper        // Session access wrapper
}

// SessionWrapper provides safe session value access for templates
type SessionWrapper struct {
	values map[interface{}]interface{}
}

// Get retrieves a session value by key
func (s *SessionWrapper) Get(key string) string {
	if s == nil || s.values == nil {
		return ""
	}
	if val, ok := s.values[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
		return fmt.Sprint(val)
	}
	return ""
}

// NewSessionWrapper creates a SessionWrapper from a gorilla session
func NewSessionWrapper(sess *sessions.Session) *SessionWrapper {
	if sess == nil {
		return &SessionWrapper{values: make(map[interface{}]interface{})}
	}
	return &SessionWrapper{values: sess.Values}
}

// TemplateEngine provides template rendering.
type TemplateEngine struct {
	templates map[string]*template.Template
	funcMap   template.FuncMap
	config    interface{} // Config for template access
}

// NewTemplateEngine creates a new template engine.
func NewTemplateEngine(templates map[string]*template.Template, funcMap template.FuncMap) *TemplateEngine {
	return &TemplateEngine{
		templates: templates,
		funcMap:   funcMap,
	}
}

// SetConfig sets the config for template access.
func (e *TemplateEngine) SetConfig(config interface{}) {
	e.config = config
}

// Render renders a template with the given data.
func (e *TemplateEngine) Render(w http.ResponseWriter, name string, data *TemplateData) error {
	// Ensure required fields are set
	if data == nil {
		data = &TemplateData{}
	}
	if data.Conf == nil && e.config != nil {
		data.Conf = e.config
	}
	if data.QueryParams == nil {
		data.QueryParams = make(map[string]string)
	}
	if data.Params == nil {
		data.Params = make(map[string]string)
	}
	if data.SystemSettings == nil {
		data.SystemSettings = make(map[string]interface{})
	}
	// Ensure Context is set (even if empty) to prevent template errors
	if data.Context == nil {
		data.Context = &apicontext.RequestContext{}
	}
	// Ensure Session wrapper is set (even if empty) to prevent template errors
	if data.Session == nil {
		data.Session = &SessionWrapper{values: make(map[interface{}]interface{})}
	}
	// Ensure ClientFlags has a default value
	// ClientFlags should be set by handlers based on user data

	tmpl, ok := e.templates[name]
	if !ok {
		http.Error(w, "Template not found", http.StatusInternalServerError)
		return nil
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	// Check what templates are available
	baseTmpl := tmpl.Lookup("base")
	tplTmpl := tmpl.Lookup("tpl")

	// Try to execute "base" template first (which includes the page-specific "tpl" template)
	// The base template calls {{ template "tpl" . }} which renders the page-specific content
	// Both "base" and "tpl" must exist for this to work properly
	if baseTmpl != nil && tplTmpl != nil {
		// Both templates exist, execute "base" which will call "tpl"
		if err := tmpl.ExecuteTemplate(w, "base", data); err != nil {
			// If base execution fails, log error and try fallback
			http.Error(w, "Template execution error: "+err.Error(), http.StatusInternalServerError)
			return err
		}
		return nil
	}

	// If "base" doesn't exist but "tpl" does, execute "tpl" directly
	if tplTmpl != nil {
		if err := tmpl.ExecuteTemplate(w, "tpl", data); err != nil {
			http.Error(w, "Template execution error: "+err.Error(), http.StatusInternalServerError)
			return err
		}
		return nil
	}

	// If only "base" exists (standalone template), execute it
	if baseTmpl != nil {
		if err := tmpl.ExecuteTemplate(w, "base", data); err != nil {
			http.Error(w, "Template execution error: "+err.Error(), http.StatusInternalServerError)
			return err
		}
		return nil
	}

	// Fallback: execute the template normally (will execute the first defined template)
	if err := tmpl.Execute(w, data); err != nil {
		http.Error(w, "Template execution error: "+err.Error(), http.StatusInternalServerError)
		return err
	}
	return nil
}

// RenderWithRequest renders a template and automatically extracts query parameters.
func (e *TemplateEngine) RenderWithRequest(w http.ResponseWriter, r *http.Request, name string, data *TemplateData) error {
	if data == nil {
		data = &TemplateData{}
	}

	// Extract query parameters
	if data.QueryParams == nil {
		data.QueryParams = make(map[string]string)
	}
	for k, v := range r.URL.Query() {
		if len(v) > 0 {
			data.QueryParams[k] = v[0]
		}
	}

	// Set config if not already set
	if data.Conf == nil && e.config != nil {
		data.Conf = e.config
	}

	// Ensure QueryParams is populated
	if data.QueryParams == nil {
		data.QueryParams = make(map[string]string)
	}

	// Session should be populated by handlers that have access to the session store
	// For now, ensure it's initialized to prevent template errors
	if data.Session == nil {
		data.Session = &SessionWrapper{values: make(map[interface{}]interface{})}
	}

	return e.Render(w, name, data)
}

// NotFound renders a 404 error page.
func (e *TemplateEngine) NotFound(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)

	// Get request context if available
	var reqCtx interface{}
	if r != nil {
		reqCtx = apicontext.GetRequestContextFromRequest(r)
	}

	data := &TemplateData{
		TitleBar: "Not Found",
		Path:     r.URL.Path,
		Context:  reqCtx,
	}
	e.Render(w, "not_found.html", data)
}

// InternalError renders a 500 error page.
func (e *TemplateEngine) InternalError(w http.ResponseWriter, r *http.Request, err error) {
	w.WriteHeader(http.StatusInternalServerError)

	var reqCtx interface{}
	if r != nil {
		reqCtx = apicontext.GetRequestContextFromRequest(r)
	}

	data := &TemplateData{
		TitleBar: "Error",
		Path:     r.URL.Path,
		Context:  reqCtx,
	}
	e.Render(w, "500.html", data)
}

// Forbidden renders a 403 error page.
func (e *TemplateEngine) Forbidden(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusForbidden)

	var reqCtx interface{}
	if r != nil {
		reqCtx = apicontext.GetRequestContextFromRequest(r)
	}

	data := &TemplateData{
		TitleBar: "Forbidden",
		Path:     r.URL.Path,
		Context:  reqCtx,
	}
	e.Render(w, "403.html", data)
}

// AddMessage adds a flash message to the session.
// Note: This should be implemented with session storage.
func AddMessage(messages *[]models.Message, msg models.Message) {
	*messages = append(*messages, msg)
}
