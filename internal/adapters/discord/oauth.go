// Package discord wraps the bits of the Discord OAuth2 flow we need to link a
// Soumetsu account: exchange an authorization code for an access token, then
// fetch the linked Discord user's snowflake ID. The flow is server-side; the
// access token is used once and discarded.
package discord

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

const (
	tokenURL = "https://discord.com/api/oauth2/token"
	userURL  = "https://discord.com/api/users/@me"
)

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
}

type userResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

// User is the subset of /users/@me we persist alongside the link.
type User struct {
	ID       string
	Username string
	Avatar   string
}

// ExchangeCode swaps the authorization code Discord redirected us with for an
// access token. redirectURI must match what was sent in the initial auth-URL.
func ExchangeCode(ctx context.Context, httpClient *http.Client, clientID, clientSecret, code, redirectURI string) (string, error) {
	form := url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("discord token exchange: status %d: %s", resp.StatusCode, string(body))
	}

	var tr tokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return "", err
	}
	if tr.AccessToken == "" {
		return "", fmt.Errorf("discord token exchange: empty access_token")
	}
	return tr.AccessToken, nil
}

// FetchUser returns the linked Discord profile for the given access token,
// using the `identify` scope (the only scope we request).
func FetchUser(ctx context.Context, httpClient *http.Client, accessToken string) (User, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, userURL, nil)
	if err != nil {
		return User{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return User{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return User{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return User{}, fmt.Errorf("discord user fetch: status %d: %s", resp.StatusCode, string(body))
	}

	var ur userResponse
	if err := json.Unmarshal(body, &ur); err != nil {
		return User{}, err
	}
	if ur.ID == "" {
		return User{}, fmt.Errorf("discord user fetch: empty id")
	}
	return User{ID: ur.ID, Username: ur.Username, Avatar: ur.Avatar}, nil
}

// AuthorizeURL builds the URL we redirect the user to so Discord can prompt
// them to grant access. scope is left at "identify" by callers.
func AuthorizeURL(clientID, redirectURI, state string) string {
	q := url.Values{
		"client_id":     {clientID},
		"redirect_uri":  {redirectURI},
		"response_type": {"code"},
		"scope":         {"identify"},
		"state":         {state},
	}
	return "https://discord.com/api/oauth2/authorize?" + q.Encode()
}
