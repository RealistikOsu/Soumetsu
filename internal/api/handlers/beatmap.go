package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/services/beatmap"
)

// BeatmapHandler handles beatmap-related requests.
type BeatmapHandler struct {
	config         *config.Config
	beatmapService *beatmap.Service
	templates      *response.TemplateEngine
}

// NewBeatmapHandler creates a new beatmap handler.
func NewBeatmapHandler(
	cfg *config.Config,
	beatmapService *beatmap.Service,
	templates *response.TemplateEngine,
) *BeatmapHandler {
	return &BeatmapHandler{
		config:         cfg,
		beatmapService: beatmapService,
		templates:      templates,
	}
}

// BeatmapPageData contains data for the beatmap page.
type BeatmapPageData struct {
	BeatmapID string
}

// BeatmapPage renders a beatmap page.
func (h *BeatmapHandler) BeatmapPage(w http.ResponseWriter, r *http.Request) {
	beatmapID := chi.URLParam(r, "id")

	h.templates.Render(w, "beatmap.html", &response.TemplateData{
		TitleBar:  "Beatmap",
		DisableHH: true,
		Context: BeatmapPageData{
			BeatmapID: beatmapID,
		},
	})
}

// BeatmapSetPageData contains data for the beatmap set page.
type BeatmapSetPageData struct {
	SetID string
}

// BeatmapSetPage renders a beatmap set page.
func (h *BeatmapHandler) BeatmapSetPage(w http.ResponseWriter, r *http.Request) {
	setID := chi.URLParam(r, "id")

	h.templates.Render(w, "beatmapset.html", &response.TemplateData{
		TitleBar:  "Beatmap Set",
		DisableHH: true,
		Context: BeatmapSetPageData{
			SetID: setID,
		},
	})
}

// BeatmapSetRedirect redirects from /beatmapsets/:id to /b/:id (first beatmap in set).
func (h *BeatmapHandler) BeatmapSetRedirect(w http.ResponseWriter, r *http.Request) {
	setID := chi.URLParam(r, "id")

	bset, err := h.beatmapService.GetBeatmapSet(r.Context(), setID)
	if err != nil || len(bset.ChildrenBeatmaps) == 0 {
		// Redirect to beatmap page if can't get beatmap data
		http.Redirect(w, r, "/beatmaps/"+setID, http.StatusFound)
		return
	}

	// Redirect to first beatmap in set
	http.Redirect(w, r, "/beatmaps/"+strconv.Itoa(bset.ChildrenBeatmaps[0].ID), http.StatusFound)
}

// DownloadBeatmap handles beatmap download requests.
func (h *BeatmapHandler) DownloadBeatmap(w http.ResponseWriter, r *http.Request) {
	setID := chi.URLParam(r, "id")

	downloadURL := h.beatmapService.GetDownloadURL(setID)
	http.Redirect(w, r, downloadURL, http.StatusFound)
}
