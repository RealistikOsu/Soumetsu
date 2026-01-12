package handlers

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/RealistikOsu/soumetsu/internal/api/response"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/services/beatmap"
)

type BeatmapHandler struct {
	config         *config.Config
	beatmapService *beatmap.Service
	templates      *response.TemplateEngine
}

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

type BeatmapPageData struct {
	BeatmapID string
}

func (h *BeatmapHandler) BeatmapPage(w http.ResponseWriter, r *http.Request) {
	beatmapID := chi.URLParam(r, "bid")

	h.templates.Render(w, "beatmaps/beatmap.html", &response.TemplateData{
		TitleBar:  "Beatmap",
		DisableHH: true,
		Context: BeatmapPageData{
			BeatmapID: beatmapID,
		},
	})
}

type BeatmapSetPageData struct {
	SetID string
}

func (h *BeatmapHandler) BeatmapSetPage(w http.ResponseWriter, r *http.Request) {
	setID := chi.URLParam(r, "sid")

	h.templates.Render(w, "beatmaps/beatmap_set.html", &response.TemplateData{
		TitleBar:  "Beatmap Set",
		DisableHH: true,
		Context: BeatmapSetPageData{
			SetID: setID,
		},
	})
}

func (h *BeatmapHandler) BeatmapSetRedirect(w http.ResponseWriter, r *http.Request) {
	setID := chi.URLParam(r, "bsetid")

	bset, err := h.beatmapService.GetBeatmapSet(r.Context(), setID)
	if err != nil || len(bset.ChildrenBeatmaps) == 0 {
		http.Redirect(w, r, "/s/"+setID, http.StatusFound)
		return
	}

	http.Redirect(w, r, "/b/"+strconv.Itoa(bset.ChildrenBeatmaps[0].ID), http.StatusFound)
}

func (h *BeatmapHandler) DownloadBeatmap(w http.ResponseWriter, r *http.Request) {
	setID := chi.URLParam(r, "sid")

	downloadURL := h.beatmapService.GetDownloadURL(setID)
	http.Redirect(w, r, downloadURL, http.StatusFound)
}
