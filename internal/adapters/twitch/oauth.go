// Package twitch wraps the parts of the Twitch OAuth2 flow needed to link a
// Soumetsu account to a Twitch channel: exchange an authorization code for an
// access token, then fetch the authenticated Twitch user. The flow is entirely
// server-side and the access token is used once and discarded — we only ever
// need the channel's immutable numeric ID and its current login name.
//
// Mirrors internal/adapters/discord, which does the same job for Discord.
package twitch

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
	authorizeURL = "https://id.twitch.tv/oauth2/authorize"
	tokenURL     = "https://id.twitch.tv/oauth2/token"
	usersURL     = "https://api.twitch.tv/helix/users"
)

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
}

type usersResponse struct {
	Data []struct {
		ID              string `json:"id"`
		Login           string `json:"login"`
		DisplayName     string `json:"display_name"`
		ProfileImageURL string `json:"profile_image_url"`
	} `json:"data"`
}

// User is the subset of the Twitch user object we persist alongside the link.
type User struct {
	// ID is Twitch's numeric user ID. It never changes, even if the channel is
	// renamed, so it is what the link is keyed on.
	ID string
	// Login is the lowercase channel name — what appears in twitch.tv/<login>
	// and what the chat bot joins.
	Login           string
	DisplayName     string
	ProfileImageURL string
}

// AuthorizeURL builds the URL the user is sent to so Twitch can prompt them to
// authorise the link.
//
// No scopes are requested: reading the authenticated user's own ID and login
// needs none, and asking for more than that would be an unnecessary grant.
func AuthorizeURL(clientID, redirectURI, state string) string {
	q := url.Values{
		"client_id":     {clientID},
		"redirect_uri":  {redirectURI},
		"response_type": {"code"},
		"scope":         {""},
		"state":         {state},
	}
	return authorizeURL + "?" + q.Encode()
}

// ExchangeCode swaps the authorization code Twitch redirected us with for an
// access token. redirectURI must match the one sent in the authorize URL.
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
		return "", fmt.Errorf("twitch token exchange: status %d: %s", resp.StatusCode, string(body))
	}

	var tr tokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return "", err
	}
	if tr.AccessToken == "" {
		return "", fmt.Errorf("twitch token exchange: empty access_token")
	}
	return tr.AccessToken, nil
}

// FetchUser returns the Twitch account that authorised the given access token.
//
// Helix requires the Client-ID header alongside the bearer token; omitting it is
// a 401 even when the token itself is valid.
func FetchUser(ctx context.Context, httpClient *http.Client, clientID, accessToken string) (User, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, usersURL, nil)
	if err != nil {
		return User{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Client-Id", clientID)
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
		return User{}, fmt.Errorf("twitch user fetch: status %d: %s", resp.StatusCode, string(body))
	}

	var ur usersResponse
	if err := json.Unmarshal(body, &ur); err != nil {
		return User{}, err
	}
	if len(ur.Data) == 0 || ur.Data[0].ID == "" {
		return User{}, fmt.Errorf("twitch user fetch: no user in response")
	}

	u := ur.Data[0]
	return User{
		ID:              u.ID,
		Login:           u.Login,
		DisplayName:     u.DisplayName,
		ProfileImageURL: u.ProfileImageURL,
	}, nil
}
