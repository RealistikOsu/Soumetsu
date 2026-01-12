// Package testutil provides testing utilities for integration tests.
package testutil

import (
	"context"
	"testing"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	"github.com/RealistikOsu/soumetsu/internal/config"
)

// TestDB creates a database connection for testing.
// It uses the test configuration with MySQL on port 2001.
func TestDB(t *testing.T) *mysql.DB {
	t.Helper()

	cfg := config.NewTestConfig()
	db, err := mysql.New(cfg.Database)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	t.Cleanup(func() {
		db.Close()
	})

	return db
}

// TestRedis creates a Redis connection for testing.
// It uses the test configuration with Redis on port 2002.
func TestRedis(t *testing.T) *redis.Client {
	t.Helper()

	cfg := config.NewTestConfig()
	client, err := redis.New(cfg.Redis)
	if err != nil {
		t.Fatalf("Failed to connect to test Redis: %v", err)
	}

	t.Cleanup(func() {
		client.Close()
	})

	return client
}

// TestContext returns a context with a timeout suitable for tests.
func TestContext(t *testing.T) context.Context {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)

	return ctx
}

// CleanupTable truncates a table after tests.
func CleanupTable(t *testing.T, db *mysql.DB, tableName string) {
	t.Helper()

	t.Cleanup(func() {
		ctx := context.Background()
		_, err := db.ExecContext(ctx, "DELETE FROM "+tableName+" WHERE 1=1")
		if err != nil {
			t.Logf("Warning: failed to cleanup table %s: %v", tableName, err)
		}
	})
}

// CleanupRedisKey deletes a Redis key after tests.
func CleanupRedisKey(t *testing.T, client *redis.Client, key string) {
	t.Helper()

	t.Cleanup(func() {
		ctx := context.Background()
		if err := client.Del(ctx, key); err != nil {
			t.Logf("Warning: failed to cleanup Redis key %s: %v", key, err)
		}
	})
}

// SkipIfNoDatabase skips the test if the database is not available.
func SkipIfNoDatabase(t *testing.T) {
	t.Helper()

	cfg := config.NewTestConfig()
	db, err := mysql.New(cfg.Database)
	if err != nil {
		t.Skipf("Skipping test: database not available: %v", err)
	}
	db.Close()
}

// SkipIfNoRedis skips the test if Redis is not available.
func SkipIfNoRedis(t *testing.T) {
	t.Helper()

	cfg := config.NewTestConfig()
	client, err := redis.New(cfg.Redis)
	if err != nil {
		t.Skipf("Skipping test: Redis not available: %v", err)
	}
	client.Close()
}

// RequireDatabase fails the test immediately if the database is not available.
func RequireDatabase(t *testing.T) {
	t.Helper()

	cfg := config.NewTestConfig()
	db, err := mysql.New(cfg.Database)
	if err != nil {
		t.Fatalf("Test requires database but it's not available: %v", err)
	}
	db.Close()
}

// RequireRedis fails the test immediately if Redis is not available.
func RequireRedis(t *testing.T) {
	t.Helper()

	cfg := config.NewTestConfig()
	client, err := redis.New(cfg.Redis)
	if err != nil {
		t.Fatalf("Test requires Redis but it's not available: %v", err)
	}
	client.Close()
}
