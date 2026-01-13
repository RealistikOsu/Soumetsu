package api

import (
	"context"
	"fmt"
)

type Friend struct {
	UserID   int    `json:"user_id"`
	Username string `json:"username"`
	Country  string `json:"country"`
}

type RelationshipsResponse struct {
	Friends   []Friend `json:"friends"`
	Followers []Friend `json:"followers"`
	Mutual    []Friend `json:"mutual"`
}

func (c *Client) GetFriends(ctx context.Context, token string) ([]Friend, error) {
	resp, err := c.Get(ctx, "/api/v2/users/me/friends", token)
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]Friend](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

func (c *Client) AddFriend(ctx context.Context, token string, userID int) error {
	path := fmt.Sprintf("/api/v2/users/me/friends/%d", userID)
	resp, err := c.Post(ctx, path, nil, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) RemoveFriend(ctx context.Context, token string, userID int) error {
	path := fmt.Sprintf("/api/v2/users/me/friends/%d", userID)
	resp, err := c.Delete(ctx, path, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) GetRelationships(ctx context.Context, token string) (*RelationshipsResponse, error) {
	resp, err := c.Get(ctx, "/api/v2/users/me/friends/relationships", token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[RelationshipsResponse](resp)
}

func (c *Client) GetUserFollowers(ctx context.Context, userID int, page, limit int) ([]Friend, error) {
	path := fmt.Sprintf("/api/v2/users/%d/followers?page=%d&limit=%d", userID, page, limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]Friend](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}
