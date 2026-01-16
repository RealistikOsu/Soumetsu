package api

import (
	"context"
	"net/url"
	"strconv"
)

type LeaderboardEntry struct {
	UserID      int     `json:"user_id"`
	Username    string  `json:"username"`
	Country     string  `json:"country"`
	PP          int     `json:"pp"`
	Accuracy    float64 `json:"accuracy"`
	Playcount   int     `json:"playcount"`
	RankedScore int64   `json:"ranked_score"`
	Rank        int     `json:"rank"`
	ClanID      int     `json:"clan_id"`
	ClanTag     string  `json:"clan_tag"`
}

type RankResponse struct {
	Rank int `json:"rank"`
}

type OldestFirstResponse struct {
	ScoreID   int64  `json:"score_id"`
	UserID    int    `json:"user_id"`
	Username  string `json:"username"`
	BeatmapID int    `json:"beatmap_id"`
	SongName  string `json:"song_name"`
	PP        int    `json:"pp"`
	Time      string `json:"time"`
}

func (c *Client) GetGlobalLeaderboard(ctx context.Context, mode, playstyle, page, limit int) ([]LeaderboardEntry, error) {
	params := url.Values{}
	params.Set("mode", strconv.Itoa(mode))
	params.Set("playstyle", strconv.Itoa(playstyle))
	params.Set("page", strconv.Itoa(page))
	params.Set("limit", strconv.Itoa(limit))
	path := "/api/v2/leaderboard?" + params.Encode()
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]LeaderboardEntry](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetCountryLeaderboard(ctx context.Context, country string, mode, playstyle, page, limit int) ([]LeaderboardEntry, error) {
	params := url.Values{}
	params.Set("mode", strconv.Itoa(mode))
	params.Set("playstyle", strconv.Itoa(playstyle))
	params.Set("page", strconv.Itoa(page))
	params.Set("limit", strconv.Itoa(limit))
	path := "/api/v2/leaderboard/country/" + url.PathEscape(country) + "?" + params.Encode()
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]LeaderboardEntry](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetRankForPP(ctx context.Context, pp int, mode, playstyle int) (*RankResponse, error) {
	params := url.Values{}
	params.Set("pp", strconv.Itoa(pp))
	params.Set("mode", strconv.Itoa(mode))
	params.Set("playstyle", strconv.Itoa(playstyle))
	path := "/api/v2/leaderboard/rank?" + params.Encode()
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[RankResponse](resp)
}

func (c *Client) GetOldestFirsts(ctx context.Context, mode, playstyle, page, limit int) ([]OldestFirstResponse, error) {
	params := url.Values{}
	params.Set("mode", strconv.Itoa(mode))
	params.Set("playstyle", strconv.Itoa(playstyle))
	params.Set("page", strconv.Itoa(page))
	params.Set("limit", strconv.Itoa(limit))
	path := "/api/v2/leaderboard/firsts/oldest?" + params.Encode()
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]OldestFirstResponse](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}
