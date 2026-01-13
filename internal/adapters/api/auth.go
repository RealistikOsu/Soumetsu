package api

import (
	"context"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Captcha  string `json:"captcha,omitempty"`
}

type LoginResponse struct {
	UserID     int    `json:"user_id"`
	Username   string `json:"username"`
	Token      string `json:"token"`
	Privileges int    `json:"privileges"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Captcha  string `json:"captcha,omitempty"`
}

type RegisterResponse struct {
	UserID int `json:"user_id"`
}

type SessionResponse struct {
	UserID     int    `json:"user_id"`
	Privileges int    `json:"privileges"`
	CreatedAt  string `json:"created_at"`
	ExpiresAt  string `json:"expires_at"`
}

func (c *Client) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	resp, err := c.Post(ctx, "/api/v2/auth/login", req, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[LoginResponse](resp)
}

func (c *Client) Register(ctx context.Context, req *RegisterRequest) (*RegisterResponse, error) {
	resp, err := c.Post(ctx, "/api/v2/auth/register", req, "")
	if err != nil {
		return nil, err
	}
	return decodeResponse[RegisterResponse](resp)
}

func (c *Client) Logout(ctx context.Context, token string) error {
	resp, err := c.Post(ctx, "/api/v2/auth/logout", nil, token)
	if err != nil {
		return err
	}
	_, err = decodeResponse[any](resp)
	return err
}

func (c *Client) GetSession(ctx context.Context, token string) (*SessionResponse, error) {
	resp, err := c.Get(ctx, "/api/v2/auth/session", token)
	if err != nil {
		return nil, err
	}
	return decodeResponse[SessionResponse](resp)
}
