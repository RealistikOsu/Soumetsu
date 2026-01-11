// Package doc handles documentation file loading and retrieval.
package doc

import (
	"bufio"
	"bytes"
	"crypto/md5"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"gopkg.in/yaml.v2"
)

const referenceLanguage = "en"

// File represents a single documentation file in a specific language.
type File struct {
	IsUpdated      bool
	Title          string
	referencesFile string
}

// Data retrieves the content of the documentation file.
func (f File) Data() (string, error) {
	data, err := os.ReadFile(f.referencesFile)
	if err != nil {
		return "", err
	}

	// Update IPs if needed
	ipMgr.update()

	// Replace IP placeholders
	res := strings.NewReplacer(
		"{ipmain}", ipMgr.main,
		"{ipmirror}", ipMgr.mirror,
	).Replace(string(data))

	return res, nil
}

// Document represents a documentation file with all its language variations.
type Document struct {
	Slug      string
	OldID     int
	Languages map[string]File
}

// File retrieves a Document's File based on the passed language.
// Returns the reference language (en) file if the requested language is not available.
func (d Document) File(lang string) File {
	if f, ok := d.Languages[lang]; ok {
		return f
	}
	return d.Languages[referenceLanguage]
}

// LanguageDoc represents a document listing entry.
type LanguageDoc struct {
	Title string
	Slug  string
}

// Loader handles loading and managing documentation files.
type Loader struct {
	docsDir string
	docs    []Document
	mu      sync.RWMutex
}

// NewLoader creates a new documentation loader.
func NewLoader(docsDir string) *Loader {
	return &Loader{
		docsDir: docsDir,
		docs:    make([]Document, 0),
	}
}

// Load loads all documentation files from the configured directory.
func (l *Loader) Load() error {
	langs, err := l.loadLanguagesAvailable()
	if err != nil {
		return err
	}

	refDir := filepath.Join(l.docsDir, referenceLanguage)
	files, err := os.ReadDir(refDir)
	if err != nil {
		return err
	}

	var docs []Document
	for _, file := range files {
		if file.IsDir() || !strings.HasSuffix(file.Name(), ".md") {
			continue
		}

		data, err := os.ReadFile(filepath.Join(refDir, file.Name()))
		if err != nil {
			return err
		}

		header := l.loadHeader(data)
		md5sum := fmt.Sprintf("%x", md5.Sum(data))

		doc := Document{
			OldID: header.OldID,
			Slug:  strings.TrimSuffix(file.Name(), ".md"),
		}

		doc.Languages, err = l.loadLanguages(langs, file.Name(), md5sum)
		if err != nil {
			return err
		}

		docs = append(docs, doc)
	}

	l.mu.Lock()
	l.docs = docs
	l.mu.Unlock()

	return nil
}

// GetDocs retrieves a list of documents in a specific language.
func (l *Loader) GetDocs(lang string) []LanguageDoc {
	l.mu.RLock()
	defer l.mu.RUnlock()

	docs := make([]LanguageDoc, 0, len(l.docs))
	for _, file := range l.docs {
		docs = append(docs, LanguageDoc{
			Slug:  file.Slug,
			Title: file.File(lang).Title,
		})
	}
	return docs
}

// GetFile retrieves a documentation file by slug and language.
func (l *Loader) GetFile(slug, language string) File {
	l.mu.RLock()
	defer l.mu.RUnlock()

	for _, f := range l.docs {
		if f.Slug == slug {
			if val, ok := f.Languages[language]; ok {
				return val
			}
			return f.Languages[referenceLanguage]
		}
	}
	return File{}
}

// SlugFromOldID gets a doc file's slug from its old ID.
func (l *Loader) SlugFromOldID(id int) string {
	l.mu.RLock()
	defer l.mu.RUnlock()

	for _, d := range l.docs {
		if d.OldID == id {
			return d.Slug
		}
	}
	return ""
}

// rawFile represents the YAML header data in documentation files.
type rawFile struct {
	Title            string `yaml:"title"`
	OldID            int    `yaml:"old_id"`
	ReferenceVersion string `yaml:"reference_version"`
}

func (l *Loader) loadHeader(b []byte) rawFile {
	s := bufio.NewScanner(bytes.NewReader(b))
	var (
		isConf bool
		conf   string
	)

	for s.Scan() {
		line := s.Text()
		if !isConf {
			if line == "---" {
				isConf = true
			}
			continue
		}
		if line == "---" {
			break
		}
		conf += line + "\n"
	}

	var f rawFile
	if err := yaml.Unmarshal([]byte(conf), &f); err != nil {
		slog.Error("Error unmarshaling yaml", "error", err)
		return rawFile{}
	}

	return f
}

func (l *Loader) loadLanguagesAvailable() ([]string, error) {
	files, err := os.ReadDir(l.docsDir)
	if err != nil {
		return nil, err
	}

	langs := make([]string, 0, len(files))
	for _, f := range files {
		if f.IsDir() {
			langs = append(langs, f.Name())
		}
	}
	return langs, nil
}

func (l *Loader) loadLanguages(langs []string, fname string, referenceMD5 string) (map[string]File, error) {
	m := make(map[string]File, len(langs))

	for _, lang := range langs {
		filePath := filepath.Join(l.docsDir, lang, fname)
		data, err := os.ReadFile(filePath)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, err
		}

		header := l.loadHeader(data)

		m[lang] = File{
			IsUpdated:      lang == referenceLanguage || header.ReferenceVersion == referenceMD5,
			Title:          header.Title,
			referencesFile: filePath,
		}
	}

	return m, nil
}

// IP management for documentation.
type ipManager struct {
	mu          sync.RWMutex
	main        string
	mirror      string
	lastUpdated time.Time
	ipRegex     *regexp.Regexp
}

var ipMgr = &ipManager{
	main:        "51.15.26.118",
	mirror:      "51.15.26.118",
	lastUpdated: time.Date(2018, 5, 13, 11, 45, 0, 0, time.UTC),
	ipRegex:     regexp.MustCompile(`^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$`),
}

func (m *ipManager) update() {
	m.mu.RLock()
	needsUpdate := time.Since(m.lastUpdated) >= time.Hour*24*14
	m.mu.RUnlock()

	if !needsUpdate {
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Since(m.lastUpdated) < time.Hour*24*14 {
		return
	}

	m.lastUpdated = time.Now()

	resp, err := http.Get("https://ip.ripple.moe")
	if err != nil {
		slog.Error("Failed to update IPs", "error", err)
		return
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Error("Failed to read IP response", "error", err)
		return
	}

	ips := strings.SplitN(string(data), "\n", 3)
	if len(ips) < 2 || !m.ipRegex.MatchString(ips[0]) || !m.ipRegex.MatchString(ips[1]) {
		return
	}

	m.main = ips[0]
	m.mirror = ips[1]
}
