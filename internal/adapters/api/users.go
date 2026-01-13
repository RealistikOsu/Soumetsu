package api

import (
	"context"
	"fmt"
	"io"
	"strconv"
)

type User struct {
	ID               int    `json:"id"`
	Username         string `json:"username"`
	UsernameAka      string `json:"username_aka"`
	RegisterDatetime string `json:"register_datetime"`
	Privileges       int    `json:"privileges"`
	LatestActivity   string `json:"latest_activity"`
	Country          string `json:"country"`
	PlayStyle        int    `json:"play_style"`
	FavouriteMode    int    `json:"favourite_mode"`
	SilenceEnd       int    `json:"silence_end"`
	SilenceReason    string `json:"silence_reason"`
	ClanID           int    `json:"clan_id"`
	Email            string `json:"email,omitempty"`
}

type UserStats struct {
	UserID       int     `json:"user_id"`
	Mode         int     `json:"mode"`
	RankedScore  int64   `json:"ranked_score"`
	TotalScore   int64   `json:"total_score"`
	Playcount    int     `json:"playcount"`
	Replays      int     `json:"replays"`
	TotalHits    int64   `json:"total_hits"`
	Level        float64 `json:"level"`
	Accuracy     float64 `json:"accuracy"`
	PP           int     `json:"pp"`
	GlobalRank   int     `json:"global_rank"`
	CountryRank  int     `json:"country_rank"`
	MaxCombo     int     `json:"max_combo"`
	Playtime     int     `json:"playtime"`
}

type UserProfile struct {
	User  User       `json:"user"`
	Stats *UserStats `json:"stats"`
}

type UpdateSettingsRequest struct {
	UsernameAka   *string `json:"username_aka,omitempty"`
	FavouriteMode *int    `json:"favourite_mode,omitempty"`
	PlayStyle     *int    `json:"play_style,omitempty"`
	CustomBadge   *string `json:"custom_badge,omitempty"`
}

type UserpageResponse struct {
	Content string `json:"content"`
}

type UpdateUserpageRequest struct {
	Content string `json:"content"`
}

func (c *Client) GetUser(ctx context.Context, userID int, mode int, playstyle int) (*UserProfile, error) {
	path := fmt.Sprintf("/api/v2/users/%d?mode=%d&playstyle=%d", userID, mode, playstyle)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[UserProfile](resp)
}

func (c *Client) GetUserByUsername(ctx context.Context, username string) (*User, error) {
	path := "/api/v2/users/resolve?username=" + username
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[User](resp)
}

func (c *Client) GetMe(ctx context.Context, token string) (*UserProfile, error) {
	resp, err := c.Get(ctx, "/api/v2/users/me", token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[UserProfile](resp)
}

func (c *Client) UpdateSettings(ctx context.Context, token string, req *UpdateSettingsRequest) error {
	resp, err := c.Put(ctx, "/api/v2/users/me/settings", req, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) GetUserpage(ctx context.Context, userID int) (*UserpageResponse, error) {
	path := fmt.Sprintf("/api/v2/users/%d/userpage", userID)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[UserpageResponse](resp)
}

func (c *Client) UpdateUserpage(ctx context.Context, token string, content string) error {
	req := &UpdateUserpageRequest{Content: content}
	resp, err := c.Put(ctx, "/api/v2/users/me/userpage", req, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) SearchUsers(ctx context.Context, query string, page, limit int) ([]User, error) {
	path := "/api/v2/users/search?q=" + query + "&page=" + strconv.Itoa(page) + "&limit=" + strconv.Itoa(limit)
	resp, err := c.Get(ctx, path, "")
	if err != nil {
		return nil, err
	}
	result, err := decodeResponse[[]User](resp)
	if err != nil {
		return nil, err
	}
	return *result, nil
}

type ChangeUsernameRequest struct {
	Username string `json:"username"`
}

func (c *Client) ChangeUsername(ctx context.Context, token string, username string) error {
	req := &ChangeUsernameRequest{Username: username}
	resp, err := c.Put(ctx, "/api/v2/users/me/username", req, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) UnlinkDiscord(ctx context.Context, token string) error {
	resp, err := c.Delete(ctx, "/api/v2/users/me/discord", token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

type EmailResponse struct {
	Email string `json:"email"`
}

func (c *Client) GetEmail(ctx context.Context, token string) (*EmailResponse, error) {
	resp, err := c.Get(ctx, "/api/v2/users/me/email", token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[EmailResponse](resp)
}

type ChangePasswordRequest struct {
	CurrentPassword string  `json:"current_password"`
	NewPassword     *string `json:"new_password,omitempty"`
	NewEmail        *string `json:"new_email,omitempty"`
}

func (c *Client) ChangePassword(ctx context.Context, token string, req *ChangePasswordRequest) error {
	resp, err := c.Put(ctx, "/api/v2/users/me/password", req, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

type UploadResponse struct {
	Path string `json:"path"`
}

// UploadAvatar uploads an avatar image for the current user
func (c *Client) UploadAvatar(ctx context.Context, token string, fileName string, fileContent io.Reader, contentType string) (*UploadResponse, error) {
	resp, err := c.PostMultipart(ctx, "/api/v2/users/me/avatar", "file", fileName, fileContent, contentType, token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[UploadResponse](resp)
}

// DeleteAvatar deletes the current user's avatar
func (c *Client) DeleteAvatar(ctx context.Context, token string) error {
	resp, err := c.Delete(ctx, "/api/v2/users/me/avatar", token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

// UploadBanner uploads a banner image for the current user
func (c *Client) UploadBanner(ctx context.Context, token string, fileName string, fileContent io.Reader, contentType string) (*UploadResponse, error) {
	resp, err := c.PostMultipart(ctx, "/api/v2/users/me/banner", "file", fileName, fileContent, contentType, token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[UploadResponse](resp)
}

// DeleteBanner deletes the current user's banner
func (c *Client) DeleteBanner(ctx context.Context, token string) error {
	resp, err := c.Delete(ctx, "/api/v2/users/me/banner", token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}
