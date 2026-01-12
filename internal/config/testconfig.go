//go:build !production

package config

// NewTestConfig returns a configuration suitable for testing.
// Uses the test service ports: MySQL=2001, Redis=2002, API=2018
func NewTestConfig() *Config {
	return &Config{
		App: AppConfig{
			Port:         2018,
			Env:          "test",
			CookieSecret: "test-cookie-secret-32-bytes-long!",
			SoumetsuKey:  "test-soumetsu-key",
			BaseURL:      "http://localhost:2018",
			AvatarURL:    "http://localhost:2018/avatars",
			APIURL:       "http://localhost:2018/api",
			BanchoURL:    "http://localhost:2018/bancho",
			AvatarsPath:  "/tmp/test-avatars",
			BannersPath:  "/tmp/test-banners",
		},
		Database: DatabaseConfig{
			Host: "localhost",
			Port: 2001,
			User: "root",
			Pass: "",
			Name: "ripple",
		},
		Redis: RedisConfig{
			MaxConnections: 10,
			NetworkType:    "tcp",
			Host:           "localhost",
			Port:           2002,
			Pass:           "",
			DB:             1, // Use DB 1 for tests to avoid conflicts
			UseSSL:         false,
		},
		Mailgun: MailgunConfig{
			Domain:    "test.mailgun.org",
			APIKey:    "test-api-key",
			PublicKey: "test-public-key",
			From:      "test@example.com",
		},
		Discord: DiscordConfig{
			ServerURL:       "http://localhost:8080",
			AppClientID:     "test-client-id",
			AppClientSecret: "test-client-secret",
			UserLookupURL:   "http://localhost:8080/users",
		},
		Beatmap: BeatmapConfig{
			MirrorAPIURL:      "http://localhost:8080/api",
			DownloadMirrorURL: "http://localhost:8080/d",
		},
		Security: SecurityConfig{
			RecaptchaSiteKey:   "test-site-key",
			RecaptchaSecretKey: "test-secret-key",
			IPLookupURL:        "http://localhost:8080/ip",
			PayPalEmail:        "test@paypal.com",
		},
	}
}
