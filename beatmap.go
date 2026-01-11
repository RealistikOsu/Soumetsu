package main

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/RealistikOsu/soumetsu/state"
	"github.com/gin-gonic/gin"
)

// Beatmap represents a single beatmap difficulty
type Beatmap struct {
	ID               int `json:"BeatmapID"`
	ParentSetID      int
	DiffName         string
	FileMD5          string
	Mode             int
	BPM              float64
	AR               float32
	OD               float32
	CS               float32
	HP               float32
	TotalLength      int
	HitLength        int
	Playcount        int
	Passcount        int
	MaxCombo         int
	DifficultyRating float64
}

// BeatmapSet represents a beatmap set with its difficulties
type BeatmapSet struct {
	ID               int `json:"SetID"`
	ChildrenBeatmaps []Beatmap
	RankedStatus     int
	Artist           string
	Title            string
	Creator          string
	Source           string
	Tags             string
}

// beatmapPageData contains minimal data for the beatmap page
// All beatmap data is now fetched client-side via Vue
type beatmapPageData struct {
	baseTemplateData
	BeatmapID string
}

func beatmapInfo(c *gin.Context) {
	data := &beatmapPageData{
		baseTemplateData: baseTemplateData{
			TitleBar:  "Beatmap",
			DisableHH: true,
		},
		BeatmapID: c.Param("bid"),
	}
	resp(c, 200, "beatmap.html", data)
}

// getBeatmapSetData fetches beatmap set data from the mirror API
// Used by the /beatmapsets/:bsetid redirect in main.go
func getBeatmapSetData(parentID string) (bset BeatmapSet, err error) {
	settings := state.GetSettings()
	resp, err := http.Get(settings.BEATMAP_MIRROR_API_URL + "/s/" + parentID)
	if err != nil {
		return bset, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return bset, err
	}

	err = json.Unmarshal(body, &bset)
	if err != nil {
		return bset, err
	}

	return bset, nil
}
