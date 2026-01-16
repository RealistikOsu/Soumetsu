package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"time"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

type Response[T any] struct {
	Status int `json:"status"`
	Data   T   `json:"data"`
}

type ErrorResponse struct {
	Status int    `json:"status"`
	Data   string `json:"data"`
}

type APIError struct {
	StatusCode int
	Code       string
}

func (e *APIError) Error() string {
	return fmt.Sprintf("api error: %s (status %d)", e.Code, e.StatusCode)
}

func (c *Client) do(ctx context.Context, method, path string, body interface{}, token string) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	return c.httpClient.Do(req)
}

func decodeResponse[T any](resp *http.Response) (*T, error) {
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		var errResp ErrorResponse
		if err := json.Unmarshal(bodyBytes, &errResp); err != nil {
			return nil, fmt.Errorf("api error: status %d", resp.StatusCode)
		}
		return nil, &APIError{StatusCode: errResp.Status, Code: errResp.Data}
	}

	var result Response[T]
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return nil, err
	}

	return &result.Data, nil
}

func (c *Client) Get(ctx context.Context, path string, token string) (*http.Response, error) {
	return c.do(ctx, http.MethodGet, path, nil, token)
}

func (c *Client) Post(ctx context.Context, path string, body interface{}, token string) (*http.Response, error) {
	return c.do(ctx, http.MethodPost, path, body, token)
}

func (c *Client) Put(ctx context.Context, path string, body interface{}, token string) (*http.Response, error) {
	return c.do(ctx, http.MethodPut, path, body, token)
}

func (c *Client) Delete(ctx context.Context, path string, token string) (*http.Response, error) {
	return c.do(ctx, http.MethodDelete, path, nil, token)
}

func (c *Client) Patch(ctx context.Context, path string, body interface{}, token string) (*http.Response, error) {
	return c.do(ctx, http.MethodPatch, path, body, token)
}

func BuildQuery(params map[string]string) string {
	if len(params) == 0 {
		return ""
	}
	values := url.Values{}
	for k, v := range params {
		if v != "" {
			values.Set(k, v)
		}
	}
	return "?" + values.Encode()
}

// PostMultipart sends a multipart form request with a file upload
func (c *Client) PostMultipart(ctx context.Context, path string, fieldName string, fileName string, fileContent io.Reader, contentType string, token string) (*http.Response, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		return nil, err
	}

	if _, err := io.Copy(part, fileContent); err != nil {
		return nil, err
	}

	if err := writer.Close(); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, &buf)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	return c.httpClient.Do(req)
}
