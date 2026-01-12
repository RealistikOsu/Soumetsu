// Package response provides HTTP response utilities.
package response

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"log/slog"
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

// Get is a legacy method that was used to make API calls from templates.
// It now returns an empty map to prevent template errors. Templates should be updated
// to fetch data in handlers or via client-side JavaScript instead.
func (td *TemplateData) Get(endpoint string, args ...interface{}) interface{} {
	// Return an empty map so template field access doesn't error
	// Templates checking for nil or field existence will work correctly
	return make(map[string]interface{})
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

// RenderWithStatus renders a template with a specific HTTP status code.
func (e *TemplateEngine) RenderWithStatus(w http.ResponseWriter, name string, data *TemplateData, statusCode int) error {
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

	tmpl, ok := e.templates[name]
	if !ok {
		http.Error(w, "Template not found", statusCode)
		return nil
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(statusCode)

	// Check what templates are available
	baseTmpl := tmpl.Lookup("base")
	tplTmpl := tmpl.Lookup("tpl")

	// Try to execute "base" template first (which includes the page-specific "tpl" template)
	// The base template calls {{ template "tpl" . }} which renders the page-specific content
	// Both "base" and "tpl" must exist for this to work properly
	if baseTmpl != nil && tplTmpl != nil {
		// Both templates exist, execute "base" which will call "tpl"
		if err := tmpl.ExecuteTemplate(w, "base", data); err != nil {
			// Headers already written, can't use http.Error, just log
			return err
		}
		return nil
	}

	// If "base" doesn't exist but "tpl" does, execute "tpl" directly
	if tplTmpl != nil {
		if err := tmpl.ExecuteTemplate(w, "tpl", data); err != nil {
			return err
		}
		return nil
	}

	// If only "base" exists (standalone template), execute it
	if baseTmpl != nil {
		if err := tmpl.ExecuteTemplate(w, "base", data); err != nil {
			return err
		}
		return nil
	}

	// Fallback: execute the template normally (will execute the first defined template)
	if err := tmpl.Execute(w, data); err != nil {
		return err
	}
	return nil
}

// Render renders a template with the given data.
// If template execution fails, it will render the 500 error page instead.
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
		// Template not found - render 500 page
		slog.Error("Template not found", "template", name)
		e.InternalError(w, nil, fmt.Errorf("template not found: %s", name))
		return fmt.Errorf("template not found: %s", name)
	}

	// Use a buffer to capture template output
	// If execution fails, we can discard the buffer and render 500 page instead
	var buf bytes.Buffer
	bufWriter := &bufferedResponseWriter{
		ResponseWriter: w,
		buffer:        &buf,
		headersWritten: false,
	}

	// Set Content-Type header (but don't write status yet)
	bufWriter.Header().Set("Content-Type", "text/html; charset=utf-8")

	// Check what templates are available
	baseTmpl := tmpl.Lookup("base")
	tplTmpl := tmpl.Lookup("tpl")

	var execErr error

	// Try to execute "base" template first (which includes the page-specific "tpl" template)
	// The base template calls {{ template "tpl" . }} which renders the page-specific content
	// Both "base" and "tpl" must exist for this to work properly
	if baseTmpl != nil && tplTmpl != nil {
		// Both templates exist, execute "base" which will call "tpl"
		execErr = tmpl.ExecuteTemplate(bufWriter, "base", data)
	} else if tplTmpl != nil {
		// If "base" doesn't exist but "tpl" does, execute "tpl" directly
		execErr = tmpl.ExecuteTemplate(bufWriter, "tpl", data)
	} else if baseTmpl != nil {
		// If only "base" exists (standalone template), execute it
		execErr = tmpl.ExecuteTemplate(bufWriter, "base", data)
	} else {
		// Fallback: execute the template normally (will execute the first defined template)
		execErr = tmpl.Execute(bufWriter, data)
	}

	// If execution failed, render 500 page instead
	if execErr != nil {
		slog.Error("Template execution error", "template", name, "error", execErr)
		// Get request from Extra if available (set by RenderWithRequest)
		var req *http.Request
		if data.Extra != nil {
			if rVal, ok := data.Extra["_request"].(*http.Request); ok {
				req = rVal
			}
		}
		// Render 500 error page (it will handle clearing headers)
		e.InternalError(w, req, execErr)
		return execErr
	}

	// Success - copy headers and write the buffered content
	for k, v := range bufWriter.Header() {
		for _, val := range v {
			w.Header().Add(k, val)
		}
	}
	if !bufWriter.headersWritten {
		w.WriteHeader(http.StatusOK)
	}
	_, err := buf.WriteTo(w)
	return err
}

// bufferedResponseWriter wraps http.ResponseWriter to buffer output
// until we know execution succeeded
type bufferedResponseWriter struct {
	http.ResponseWriter
	buffer         *bytes.Buffer
	headersWritten bool
	header         http.Header
}

func (b *bufferedResponseWriter) Header() http.Header {
	if b.header == nil {
		b.header = make(http.Header)
	}
	return b.header
}

func (b *bufferedResponseWriter) Write(p []byte) (int, error) {
	return b.buffer.Write(p)
}

func (b *bufferedResponseWriter) WriteHeader(code int) {
	b.headersWritten = true
	// Don't write header yet - we'll write it after successful execution
	// Just store the code for now (though we won't use it if there's an error)
}

// RenderWithRequest renders a template and automatically extracts query parameters.
func (e *TemplateEngine) RenderWithRequest(w http.ResponseWriter, r *http.Request, name string, data *TemplateData) error {
	if data == nil {
		data = &TemplateData{}
	}

	// Set Path from request URL if not already set
	if data.Path == "" && r != nil {
		data.Path = r.URL.Path
	}

	// Extract query parameters
	if data.QueryParams == nil {
		data.QueryParams = make(map[string]string)
	}
	if r != nil {
		for k, v := range r.URL.Query() {
			if len(v) > 0 {
				data.QueryParams[k] = v[0]
			}
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

	// Store request in Extra so Render can access it for error handling
	if data.Extra == nil {
		data.Extra = make(map[string]interface{})
	}
	if r != nil {
		data.Extra["_request"] = r
	}

	return e.Render(w, name, data)
}

// NotFound renders a 404 error page.
func (e *TemplateEngine) NotFound(w http.ResponseWriter, r *http.Request) {
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
	e.RenderWithStatus(w, "not_found.html", data, http.StatusNotFound)
}

// InternalError renders a 500 error page.
func (e *TemplateEngine) InternalError(w http.ResponseWriter, r *http.Request, err error) {
	var reqCtx interface{}
	var path string
	if r != nil {
		reqCtx = apicontext.GetRequestContextFromRequest(r)
		path = r.URL.Path
	}

	data := &TemplateData{
		TitleBar: "Error",
		Path:     path,
		Context:  reqCtx,
	}
	
	// Render with status code - Render will handle headers
	e.RenderWithStatus(w, "500.html", data, http.StatusInternalServerError)
}

// Forbidden renders a 403 error page.
func (e *TemplateEngine) Forbidden(w http.ResponseWriter, r *http.Request) {
	var reqCtx interface{}
	if r != nil {
		reqCtx = apicontext.GetRequestContextFromRequest(r)
	}

	data := &TemplateData{
		TitleBar: "Forbidden",
		Path:     r.URL.Path,
		Context:  reqCtx,
	}
	e.RenderWithStatus(w, "403.html", data, http.StatusForbidden)
}

// AddMessage adds a flash message to the session.
// Note: This should be implemented with session storage.
func AddMessage(messages *[]models.Message, msg models.Message) {
	*messages = append(*messages, msg)
}
