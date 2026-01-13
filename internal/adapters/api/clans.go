package api

import (
	"context"
	"fmt"
	"strconv"
)

type Clan struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Tag         string `json:"tag"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	OwnerID     int    `json:"owner_id"`
	CreatedAt   string `json:"created_at"`
	MemberCount int    `json:"member_count"`
}

type ClanMember struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Country  string `json:"country"`
	JoinedAt string `json:"joined_at"`
	IsOwner  bool   `json:"is_owner"`
}

type ClanStats struct {
	TotalPP         int `json:"total_pp"`
	AveragePP       int `json:"average_pp"`
	TotalRankedScore int64 `json:"total_ranked_score"`
	TotalPlaycount   int   `json:"total_playcount"`
	Rank            int `json:"rank"`
}

type ClanResponse struct {
	Clan    Clan        `json:"clan"`
	Stats   *ClanStats  `json:"stats,omitempty"`
	Members []ClanMember `json:"members,omitempty"`
}

type CreateClanRequest struct {
	Name        string `json:"name"`
	Tag         string `json:"tag"`
	Description string `json:"description"`
}

type UpdateClanRequest struct {
	Name        *string `json:"name,omitempty"`
	Tag         *string `json:"tag,omitempty"`
	Description *string `json:"description,omitempty"`
	Icon        *string `json:"icon,omitempty"`
}

type ClanInviteResponse struct {
	InviteCode string `json:"invite_code"`
}

func (c *Client) GetClan(ctx context.Context, clanID int) (*ClanResponse, error) {
	path := fmt.Sprintf("/api/v2/clans/%d", clanID)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[ClanResponse](resp)
}

func (c *Client) GetClanMembers(ctx context.Context, clanID int, page, limit int) ([]ClanMember, error) {
	path := fmt.Sprintf("/api/v2/clans/%d/members?page=%d&limit=%d", clanID, page, limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]ClanMember](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) GetClanStats(ctx context.Context, clanID int, mode, playstyle int) (*ClanStats, error) {
	path := fmt.Sprintf("/api/v2/clans/%d/stats?mode=%d&playstyle=%d", clanID, mode, playstyle)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[ClanStats](resp)
}

func (c *Client) ListClans(ctx context.Context, page, limit int, sort string) ([]Clan, error) {
	path := "/api/v2/clans?page=" + strconv.Itoa(page) + "&limit=" + strconv.Itoa(limit)
	if sort != "" {
		path += "&sort=" + sort
	}
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]Clan](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) CreateClan(ctx context.Context, token string, req *CreateClanRequest) (*Clan, error) {
	resp, err := c.Post(ctx, "/api/v2/clans", req, token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[Clan](resp)
}

func (c *Client) UpdateClan(ctx context.Context, token string, clanID int, req *UpdateClanRequest) error {
	path := fmt.Sprintf("/api/v2/clans/%d", clanID)
	resp, err := c.Put(ctx, path, req, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) DeleteClan(ctx context.Context, token string, clanID int) error {
	path := fmt.Sprintf("/api/v2/clans/%d", clanID)
	resp, err := c.Delete(ctx, path, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) JoinClan(ctx context.Context, token string, clanID int, inviteCode string) error {
	path := fmt.Sprintf("/api/v2/clans/%d/join?invite=%s", clanID, inviteCode)
	resp, err := c.Post(ctx, path, nil, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) JoinClanByInvite(ctx context.Context, token string, inviteCode string) (*Clan, error) {
	path := fmt.Sprintf("/api/v2/clans/join?invite=%s", inviteCode)
	resp, err := c.Post(ctx, path, nil, token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[Clan](resp)
}

func (c *Client) LeaveClan(ctx context.Context, token string, clanID int) error {
	path := fmt.Sprintf("/api/v2/clans/%d/members/me", clanID)
	resp, err := c.Delete(ctx, path, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) KickClanMember(ctx context.Context, token string, clanID int, userID int) error {
	path := fmt.Sprintf("/api/v2/clans/%d/members/%d", clanID, userID)
	resp, err := c.Delete(ctx, path, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) GetClanInvite(ctx context.Context, token string, clanID int) (*ClanInviteResponse, error) {
	path := fmt.Sprintf("/api/v2/clans/%d/invite", clanID)
	resp, err := c.Get(ctx, path, token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[ClanInviteResponse](resp)
}

func (c *Client) GenerateClanInvite(ctx context.Context, token string, clanID int) (*ClanInviteResponse, error) {
	path := fmt.Sprintf("/api/v2/clans/%d/invite", clanID)
	resp, err := c.Post(ctx, path, nil, token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[ClanInviteResponse](resp)
}

func (c *Client) GetClanLeaderboard(ctx context.Context, mode, playstyle, page, limit int) ([]ClanResponse, error) {
	path := fmt.Sprintf("/api/v2/clans/leaderboard?mode=%d&playstyle=%d&page=%d&limit=%d", mode, playstyle, page, limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]ClanResponse](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}
