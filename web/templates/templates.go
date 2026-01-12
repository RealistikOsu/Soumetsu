package templates

import (
	"bufio"
	"html/template"
	"io/ioutil"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/thehowl/conf"
)

var (
	baseTemplates = []string{
		"web/templates/base.html",
		"web/templates/navbar.html",
		"web/templates/simplepag.html",
	}
)

type Engine struct {
	templatesDir string
	templates    map[string]*template.Template
	funcMap      template.FuncMap
	mu           sync.RWMutex
	simplePages  []TemplateConfig
}

func NewEngine(templatesDir string, funcMap template.FuncMap) *Engine {
	return &Engine{
		templatesDir: templatesDir,
		templates:    make(map[string]*template.Template),
		funcMap:      funcMap,
		simplePages:  make([]TemplateConfig, 0),
	}
}

func (e *Engine) Load() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.templates = make(map[string]*template.Template)
	e.simplePages = []TemplateConfig{}

	return e.loadTemplates("")
}

func (e *Engine) GetTemplate(name string) *template.Template {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.templates[name]
}

func (e *Engine) GetTemplates() map[string]*template.Template {
	e.mu.RLock()
	defer e.mu.RUnlock()

	result := make(map[string]*template.Template, len(e.templates))
	for k, v := range e.templates {
		result[k] = v
	}
	return result
}

func (e *Engine) GetSimplePages() []TemplateConfig {
	e.mu.RLock()
	defer e.mu.RUnlock()

	result := make([]TemplateConfig, len(e.simplePages))
	copy(result, e.simplePages)
	return result
}

func (e *Engine) loadTemplates(subdir string) error {
	dirPath := filepath.Join(e.templatesDir, subdir)
	entries, err := ioutil.ReadDir(dirPath)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() {
			if entry.Name() == "." || entry.Name() == ".." {
				continue
			}
			nextSubdir := subdir
			if nextSubdir != "" {
				nextSubdir += "/"
			}
			nextSubdir += entry.Name()
			if err := e.loadTemplates(nextSubdir); err != nil {
				return err
			}
			continue
		}

		if !strings.HasSuffix(entry.Name(), ".html") {
			continue
		}

		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		fullPath := filepath.Join(dirPath, entry.Name())
		relPath := filepath.Join(subdir, entry.Name())

		cfg := e.parseConfig(fullPath)
		if cfg != nil && cfg.NoCompile {
			continue
		}

		var files []string
		if cfg != nil {
			files = cfg.inc(e.templatesDir, subdir)
		}
		files = append(files, fullPath)

		var skip bool
		for _, base := range baseTemplates {
			if fullPath == base {
				skip = true
				break
			}
		}
		if skip {
			continue
		}

		files = append(files, baseTemplates...)

		tmpl, err := template.New(entry.Name()).Funcs(e.funcMap).ParseFiles(files...)
		if err != nil {
			slog.Error("Failed to parse template", "path", fullPath, "error", err)
			continue
		}

		templateName := strings.TrimPrefix(relPath, string(filepath.Separator))
		templateName = strings.ReplaceAll(templateName, string(filepath.Separator), "/")
		e.templates[templateName] = tmpl

		if cfg != nil {
			cfg.Template = templateName
			e.simplePages = append(e.simplePages, *cfg)
		}
	}

	return nil
}

type TemplateConfig struct {
	NoCompile        bool
	Include          string
	Template         string
	Handler          string
	TitleBar         string
	KyutGrill        string
	MinPrivileges    uint64
	HugeHeadingRight bool
	AdditionalJS     string
}

func (t TemplateConfig) inc(templatesDir, subdir string) []string {
	if t.Include == "" {
		return nil
	}
	parts := strings.Split(t.Include, ",")
	files := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		includePath := filepath.Join(templatesDir, subdir, part)
		files = append(files, includePath)
	}
	return files
}

func (e *Engine) parseConfig(path string) *TemplateConfig {
	f, err := os.Open(path)
	if err != nil {
		return nil
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	var inConfig bool
	var buff strings.Builder

	for scanner.Scan() {
		line := scanner.Text()
		switch line {
		case "{{/*###":
			inConfig = true
		case "*/}}":
			if !inConfig {
				continue
			}
			var cfg TemplateConfig
			if err := conf.LoadRaw(&cfg, []byte(buff.String())); err != nil {
				slog.Error("Failed to parse template config", "path", path, "error", err)
				return nil
			}
			return &cfg
		}
		if inConfig {
			buff.WriteString(line)
			buff.WriteString("\n")
		}
	}

	return nil
}

func (e *Engine) Watch() error {
	return nil
}

func (e *Engine) Reload() error {
	return e.Load()
}
