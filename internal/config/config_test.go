package config

import (
	"os"
	"testing"
)

// SetTestEnv sets environment variables for testing and returns a cleanup function.
func SetTestEnv(t *testing.T) func() {
	t.Helper()

	envVars := map[string]string{
		"SOUMETSU_PORT":                        "2018",
		"SOUMETSU_ENV":                         "test",
		"SOUMETSU_COOKIE_SECRET":               "test-cookie-secret-32-bytes-long!",
		"SOUMETSU_KEY":                         "test-soumetsu-key",
		"SOUMETSU_BASE_URL":                    "http://localhost:2018",
		"SOUMETSU_AVATAR_URL":                  "http://localhost:2018/avatars",
		"SOUMETSU_API_URL":                     "http://localhost:2018/api",
		"SOUMETSU_BANCHO_URL":                  "http://localhost:2018/bancho",
		"SOUMETSU_INTERNAL_AVATARS_PATH":       "/tmp/test-avatars",
		"SOUMETSU_INTERNAL_BANNERS_PATH":       "/tmp/test-banners",
		"MYSQL_HOST":                           "localhost",
		"MYSQL_TCP_PORT":                       "2001",
		"MYSQL_USER":                           "root",
		"MYSQL_PASSWORD":                       "",
		"MYSQL_DATABASE":                       "ripple",
		"REDIS_MAX_CONNECTIONS":                "10",
		"REDIS_NETWORK_TYPE":                   "tcp",
		"REDIS_HOST":                           "localhost",
		"REDIS_PORT":                           "2002",
		"REDIS_PASS":                           "",
		"REDIS_DB":                             "1",
		"REDIS_USE_SSL":                        "false",
		"DISCORD_SERVER_URL":                   "http://localhost:8080",
		"DISCORD_APP_CLIENT_ID":                "test-client-id",
		"DISCORD_APP_CLIENT_SECRET":            "test-client-secret",
		"DISCORD_USER_LOOKUP_URL":              "http://localhost:8080/users",
		"SOUMETSU_BEATMAP_MIRROR_API_URL":      "http://localhost:8080/api",
		"SOUMETSU_BEATMAP_DOWNLOAD_MIRROR_URL": "http://localhost:8080/d",
		"RECAPTCHA_SITE_KEY":                   "test-site-key",
		"RECAPTCHA_SECRET_KEY":                 "test-secret-key",
		"IP_LOOKUP_URL":                        "http://localhost:8080/ip",
		"PAYPAL_EMAIL_ADDRESS":                 "test@paypal.com",
	}

	// Store original values
	originals := make(map[string]string)
	for key := range envVars {
		if val, exists := os.LookupEnv(key); exists {
			originals[key] = val
		}
	}

	// Set test values
	for key, val := range envVars {
		os.Setenv(key, val)
	}

	// Return cleanup function
	return func() {
		for key := range envVars {
			if orig, exists := originals[key]; exists {
				os.Setenv(key, orig)
			} else {
				os.Unsetenv(key)
			}
		}
	}
}

func TestLoadConfig(t *testing.T) {
	cleanup := SetTestEnv(t)
	defer cleanup()

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.App.Port != 2018 {
		t.Errorf("App.Port = %d, want 2018", cfg.App.Port)
	}

	if cfg.Database.Port != 2001 {
		t.Errorf("Database.Port = %d, want 2001", cfg.Database.Port)
	}

	if cfg.Redis.Port != 2002 {
		t.Errorf("Redis.Port = %d, want 2002", cfg.Redis.Port)
	}
}

func TestDatabaseDSN(t *testing.T) {
	cfg := NewTestConfig()
	expected := "root:@tcp(localhost:2001)/ripple?parseTime=true"
	if got := cfg.Database.DSN(); got != expected {
		t.Errorf("Database.DSN() = %q, want %q", got, expected)
	}
}

func TestRedisAddr(t *testing.T) {
	cfg := NewTestConfig()
	expected := "localhost:2002"
	if got := cfg.Redis.Addr(); got != expected {
		t.Errorf("Redis.Addr() = %q, want %q", got, expected)
	}
}
