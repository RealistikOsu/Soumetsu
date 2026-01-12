package redis

import (
	"context"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/config"
	"gopkg.in/redis.v5"
)

type Client struct {
	*redis.Client
}

func New(cfg config.RedisConfig) (*Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Pass,
		DB:       cfg.DB,
	})

	if _, err := client.Ping().Result(); err != nil {
		return nil, err
	}

	return &Client{Client: client}, nil
}

func (c *Client) Get(ctx context.Context, key string) (string, error) {
	return c.Client.Get(key).Result()
}

func (c *Client) Set(ctx context.Context, key string, value any, expiration time.Duration) error {
	return c.Client.Set(key, value, expiration).Err()
}

func (c *Client) Del(ctx context.Context, keys ...string) error {
	return c.Client.Del(keys...).Err()
}

func (c *Client) Publish(ctx context.Context, channel string, message string) error {
	return c.Client.Publish(channel, message).Err()
}

func (c *Client) Exists(ctx context.Context, key string) (bool, error) {
	result, err := c.Client.Exists(key).Result()
	return result, err
}

func (c *Client) Expire(ctx context.Context, key string, expiration time.Duration) error {
	return c.Client.Expire(key, expiration).Err()
}

func (c *Client) Close() error {
	return c.Client.Close()
}
