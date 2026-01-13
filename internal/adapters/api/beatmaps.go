package api

import (
	"context"
	"fmt"
	"strconv"
)

type Beatmap struct {
	BeatmapID     int     `json:"beatmap_id"`
	BeatmapsetID  int     `json:"beatmapset_id"`
	BeatmapMD5    string  `json:"beatmap_md5"`
	SongName      string  `json:"song_name"`
	AR            float64 `json:"ar"`
	OD            float64 `json:"od"`
	Mode          int     `json:"mode"`
	MaxCombo      int     `json:"max_combo"`
	HitLength     int     `json:"hit_length"`
	BPM           int     `json:"bpm"`
	Playcount     int     `json:"playcount"`
	Passcount     int     `json:"passcount"`
	Ranked        int     `json:"ranked"`
	LatestUpdate  string  `json:"latest_update"`
	DifficultyStd float64 `json:"difficulty_std"`
	MapperID      int     `json:"mapper_id"`
}

func (c *Client) GetBeatmap(ctx context.Context, beatmapID int) (*Beatmap, error) {
	path := fmt.Sprintf("/api/v2/beatmaps/%d", beatmapID)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[Beatmap](resp)
}

func (c *Client) GetBeatmapByMD5(ctx context.Context, md5 string) (*Beatmap, error) {
	path := "/api/v2/beatmaps/lookup?md5=" + md5
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[Beatmap](resp)
}

func (c *Client) SearchBeatmaps(ctx context.Context, query string, mode, ranked, page, limit int) ([]Beatmap, error) {
	path := "/api/v2/beatmaps?q=" + query + "&mode=" + strconv.Itoa(mode) + "&ranked=" + strconv.Itoa(ranked) +
		"&page=" + strconv.Itoa(page) + "&limit=" + strconv.Itoa(limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]Beatmap](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetPopularBeatmaps(ctx context.Context, mode, page, limit int) ([]Beatmap, error) {
	path := "/api/v2/beatmaps/popular?mode=" + strconv.Itoa(mode) + "&page=" + strconv.Itoa(page) + "&limit=" + strconv.Itoa(limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]Beatmap](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}
