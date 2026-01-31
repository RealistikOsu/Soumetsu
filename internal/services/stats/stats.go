package stats

import (
	"context"
	"strconv"

	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
)

const (
	keyRegisteredUsers = "ripple:registered_users"
	keyOnlineUsers     = "ripple:online_users"
)

type ServerStats struct {
	RegisteredUsers int
	OnlineUsers     int
}

type Service struct {
	redis *redis.Client
}

func NewService(redis *redis.Client) *Service {
	return &Service{redis: redis}
}

func (s *Service) GetServerStats(ctx context.Context) (*ServerStats, error) {
	stats := &ServerStats{}

	if val, err := s.redis.Get(ctx, keyRegisteredUsers); err == nil {
		stats.RegisteredUsers, _ = strconv.Atoi(val)
	}

	if val, err := s.redis.Get(ctx, keyOnlineUsers); err == nil {
		stats.OnlineUsers, _ = strconv.Atoi(val)
	}

	return stats, nil
}
