package redis

import (
	"context"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/config"
	"gopkg.in/redis.v5"
)

// Client wraps the Redis client to provide a consistent interface.
type Client struct {
	*redis.Client
}

// New creates a new Redis client.
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

// Get retrieves a value from Redis.
func (c *Client) Get(ctx context.Context, key string) (string, error) {
	return c.Client.Get(key).Result()
}

// Set stores a value in Redis.
func (c *Client) Set(ctx context.Context, key string, value any, expiration time.Duration) error {
	return c.Client.Set(key, value, expiration).Err()
}

// Del deletes a key from Redis.
func (c *Client) Del(ctx context.Context, keys ...string) error {
	return c.Client.Del(keys...).Err()
}

// Publish publishes a message to a Redis channel.
func (c *Client) Publish(ctx context.Context, channel string, message string) error {
	return c.Client.Publish(channel, message).Err()
}

// Exists checks if a key exists in Redis.
func (c *Client) Exists(ctx context.Context, key string) (bool, error) {
	result, err := c.Client.Exists(key).Result()
	return result, err
}

// Expire sets an expiration on a key.
func (c *Client) Expire(ctx context.Context, key string, expiration time.Duration) error {
	return c.Client.Expire(key, expiration).Err()
}

// Close closes the Redis connection.
func (c *Client) Close() error {
	return c.Client.Close()
}
