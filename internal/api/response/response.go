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

type JSONResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func JSONSuccess(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, JSONResponse{
		Success: true,
		Data:    data,
	})
}

func JSONError(w http.ResponseWriter, statusCode int, message string) {
	JSON(w, statusCode, JSONResponse{
		Success: false,
		Message: message,
	})
}

func Error(w http.ResponseWriter, err error) {
	if svcErr, ok := err.(*services.ServiceError); ok {
		JSONError(w, svcErr.StatusCode, svcErr.Message)
		return
	}
	JSONError(w, http.StatusInternalServerError, "An unexpected error occurred")
}

func Redirect(w http.ResponseWriter, r *http.Request, url string, code int) {
	http.Redirect(w, r, url, code)
}

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

func (td *TemplateData) Get(endpoint string, args ...interface{}) interface{} {
	return make(map[string]interface{})
}

type SessionWrapper struct {
	values map[interface{}]interface{}
}

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

func NewSessionWrapper(sess *sessions.Session) *SessionWrapper {
	if sess == nil {
		return &SessionWrapper{values: make(map[interface{}]interface{})}
	}
	return &SessionWrapper{values: sess.Values}
}

type TemplateEngine struct {
	templates map[string]*template.Template
	funcMap   template.FuncMap
	config    interface{} // Config for template access
}

func NewTemplateEngine(templates map[string]*template.Template, funcMap template.FuncMap) *TemplateEngine {
	return &TemplateEngine{
		templates: templates,
		funcMap:   funcMap,
	}
}

func (e *TemplateEngine) SetConfig(config interface{}) {
	e.config = config
}

func (e *TemplateEngine) RenderWithStatus(w http.ResponseWriter, name string, data *TemplateData, statusCode int) error {
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
	if data.Context == nil {
		data.Context = &apicontext.RequestContext{}
	}
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

	baseTmpl := tmpl.Lookup("base")
	tplTmpl := tmpl.Lookup("tpl")

	if baseTmpl != nil && tplTmpl != nil {
		if err := tmpl.ExecuteTemplate(w, "base", data); err != nil {
			return err
		}
		return nil
	}

	if tplTmpl != nil {
		if err := tmpl.ExecuteTemplate(w, "tpl", data); err != nil {
			return err
		}
		return nil
	}

	if baseTmpl != nil {
		if err := tmpl.ExecuteTemplate(w, "base", data); err != nil {
			return err
		}
		return nil
	}

	if err := tmpl.Execute(w, data); err != nil {
		return err
	}
	return nil
}

func (e *TemplateEngine) Render(w http.ResponseWriter, name string, data *TemplateData) error {
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
	if data.Context == nil {
		data.Context = &apicontext.RequestContext{}
	}
	if data.Session == nil {
		data.Session = &SessionWrapper{values: make(map[interface{}]interface{})}
	}

	tmpl, ok := e.templates[name]
	if !ok {
		slog.Error("Template not found", "template", name)
		e.InternalError(w, nil, fmt.Errorf("template not found: %s", name))
		return fmt.Errorf("template not found: %s", name)
	}

	var buf bytes.Buffer
	bufWriter := &bufferedResponseWriter{
		ResponseWriter: w,
		buffer:         &buf,
		headersWritten: false,
	}

	bufWriter.Header().Set("Content-Type", "text/html; charset=utf-8")

	baseTmpl := tmpl.Lookup("base")
	tplTmpl := tmpl.Lookup("tpl")

	var execErr error

	if baseTmpl != nil && tplTmpl != nil {
		execErr = tmpl.ExecuteTemplate(bufWriter, "base", data)
	} else if tplTmpl != nil {
		execErr = tmpl.ExecuteTemplate(bufWriter, "tpl", data)
	} else if baseTmpl != nil {
		execErr = tmpl.ExecuteTemplate(bufWriter, "base", data)
	} else {
		execErr = tmpl.Execute(bufWriter, data)
	}

	if execErr != nil {
		slog.Error("Template execution error", "template", name, "error", execErr)
		var req *http.Request
		if data.Extra != nil {
			if rVal, ok := data.Extra["_request"].(*http.Request); ok {
				req = rVal
			}
		}
		e.InternalError(w, req, execErr)
		return execErr
	}

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
}

func (e *TemplateEngine) RenderWithRequest(w http.ResponseWriter, r *http.Request, name string, data *TemplateData) error {
	if data == nil {
		data = &TemplateData{}
	}

	if data.Path == "" && r != nil {
		data.Path = r.URL.Path
	}

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

	if data.Conf == nil && e.config != nil {
		data.Conf = e.config
	}

	if data.QueryParams == nil {
		data.QueryParams = make(map[string]string)
	}

	if data.Session == nil {
		data.Session = &SessionWrapper{values: make(map[interface{}]interface{})}
	}

	if data.Extra == nil {
		data.Extra = make(map[string]interface{})
	}
	if r != nil {
		data.Extra["_request"] = r
	}

	return e.Render(w, name, data)
}

func (e *TemplateEngine) NotFound(w http.ResponseWriter, r *http.Request) {
	var reqCtx interface{}
	if r != nil {
		reqCtx = apicontext.GetRequestContextFromRequest(r)
	}

	data := &TemplateData{
		TitleBar: "Not Found",
		Path:     r.URL.Path,
		Context:  reqCtx,
	}
	e.RenderWithStatus(w, "errors/error_404.html", data, http.StatusNotFound)
}

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
	e.RenderWithStatus(w, "errors/error_500.html", data, http.StatusInternalServerError)
}

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

func AddMessage(messages *[]models.Message, msg models.Message) {
	*messages = append(*messages, msg)
}
