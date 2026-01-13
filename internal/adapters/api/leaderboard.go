package api

import (
	"context"
	"fmt"
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
	path := fmt.Sprintf("/api/v2/leaderboard?mode=%d&playstyle=%d&page=%d&limit=%d",
		mode, playstyle, page, limit)
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
	path := fmt.Sprintf("/api/v2/leaderboard/country/%s?mode=%d&playstyle=%d&page=%d&limit=%d",
		country, mode, playstyle, page, limit)
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
	path := "/api/v2/leaderboard/rank?pp=" + strconv.Itoa(pp) + "&mode=" + strconv.Itoa(mode) + "&playstyle=" + strconv.Itoa(playstyle)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[RankResponse](resp)
}

func (c *Client) GetOldestFirsts(ctx context.Context, mode, playstyle, page, limit int) ([]OldestFirstResponse, error) {
	path := fmt.Sprintf("/api/v2/leaderboard/firsts/oldest?mode=%d&playstyle=%d&page=%d&limit=%d",
		mode, playstyle, page, limit)
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
