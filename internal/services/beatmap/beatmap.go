// Package beatmap provides beatmap data services.
package beatmap

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
)

// Service provides beatmap data operations.
type Service struct {
	config *config.Config
}

// NewService creates a new beatmap service.
func NewService(cfg *config.Config) *Service {
	return &Service{config: cfg}
}

// GetBeatmapSet fetches a beatmap set from the mirror API.
func (s *Service) GetBeatmapSet(ctx context.Context, setID string) (*models.BeatmapSet, error) {
	resp, err := http.Get(s.config.Beatmap.MirrorAPIURL + "/s/" + setID)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var bset models.BeatmapSet
	if err := json.Unmarshal(body, &bset); err != nil {
		return nil, err
	}

	return &bset, nil
}

// GetBeatmap fetches a single beatmap from the mirror API.
func (s *Service) GetBeatmap(ctx context.Context, beatmapID string) (*models.Beatmap, error) {
	resp, err := http.Get(s.config.Beatmap.MirrorAPIURL + "/b/" + beatmapID)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var beatmap models.Beatmap
	if err := json.Unmarshal(body, &beatmap); err != nil {
		return nil, err
	}

	return &beatmap, nil
}

// GetDownloadURL returns the download URL for a beatmap set.
func (s *Service) GetDownloadURL(setID string) string {
	return s.config.Beatmap.DownloadMirrorURL + "/" + setID
}
