package api

import (
	"context"
	"fmt"
	"strconv"
)

type Score struct {
	ID          int64   `json:"id"`
	BeatmapID   int     `json:"beatmap_id"`
	UserID      int     `json:"user_id"`
	Score       int64   `json:"score"`
	PP          float64 `json:"pp"`
	Accuracy    float64 `json:"accuracy"`
	MaxCombo    int     `json:"max_combo"`
	FullCombo   bool    `json:"full_combo"`
	Mods        int     `json:"mods"`
	Count300    int     `json:"count_300"`
	Count100    int     `json:"count_100"`
	Count50     int     `json:"count_50"`
	CountMisses int     `json:"count_misses"`
	CountGekis  int     `json:"count_gekis"`
	CountKatus  int     `json:"count_katus"`
	Grade       string  `json:"grade"`
	Time        string  `json:"time"`
	Mode        int     `json:"mode"`
	CustomMode  int     `json:"custom_mode"`
	Pinned      bool    `json:"pinned"`
}

type ScoreWithBeatmap struct {
	Score
	BeatmapMD5   string `json:"beatmap_md5"`
	SongName     string `json:"song_name"`
	BeatmapsetID int    `json:"beatmapset_id"`
}

func (c *Client) GetUserBestScores(ctx context.Context, userID int, mode, customMode, page, limit int) ([]ScoreWithBeatmap, error) {
	path := fmt.Sprintf("/api/v2/users/%d/scores/best?mode=%d&custom_mode=%d&page=%d&limit=%d",
		userID, mode, customMode, page, limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]ScoreWithBeatmap](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetUserRecentScores(ctx context.Context, userID int, mode, customMode, page, limit int) ([]ScoreWithBeatmap, error) {
	path := fmt.Sprintf("/api/v2/users/%d/scores/recent?mode=%d&custom_mode=%d&page=%d&limit=%d",
		userID, mode, customMode, page, limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]ScoreWithBeatmap](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetUserFirstPlaceScores(ctx context.Context, userID int, mode, customMode, page, limit int) ([]ScoreWithBeatmap, error) {
	path := fmt.Sprintf("/api/v2/users/%d/scores/firsts?mode=%d&custom_mode=%d&page=%d&limit=%d",
		userID, mode, customMode, page, limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]ScoreWithBeatmap](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetUserPinnedScores(ctx context.Context, userID int, mode, customMode int) ([]ScoreWithBeatmap, error) {
	path := fmt.Sprintf("/api/v2/users/%d/scores/pinned?mode=%d&custom_mode=%d", userID, mode, customMode)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]ScoreWithBeatmap](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetScore(ctx context.Context, scoreID int64) (*ScoreWithBeatmap, error) {
	path := fmt.Sprintf("/api/v2/scores/%d", scoreID)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[ScoreWithBeatmap](resp)
}

func (c *Client) PinScore(ctx context.Context, token string, scoreID int64) error {
	path := fmt.Sprintf("/api/v2/scores/%d/pin", scoreID)
	resp, err := c.Post(ctx, path, nil, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) UnpinScore(ctx context.Context, token string, scoreID int64) error {
	path := fmt.Sprintf("/api/v2/scores/%d/pin", scoreID)
	resp, err := c.Delete(ctx, path, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) GetBeatmapScores(ctx context.Context, beatmapID int, mode, customMode, page, limit int) ([]Score, error) {
	path := fmt.Sprintf("/api/v2/beatmaps/%d/scores?mode=%d&custom_mode=%d&page=%d&limit=%d",
		beatmapID, mode, customMode, page, limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]Score](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetTopPlays(ctx context.Context, mode, customMode, page, limit int) ([]ScoreWithBeatmap, error) {
	path := "/api/v2/scores/top?mode=" + strconv.Itoa(mode) + "&custom_mode=" + strconv.Itoa(customMode) +
		"&page=" + strconv.Itoa(page) + "&limit=" + strconv.Itoa(limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]ScoreWithBeatmap](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}
