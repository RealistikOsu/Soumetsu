package config

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration values for the application.
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Mailgun  MailgunConfig
	Discord  DiscordConfig
	Beatmap  BeatmapConfig
	Security SecurityConfig
}

// AppConfig holds application-level configuration.
type AppConfig struct {
	Port         int
	Env          string
	CookieSecret string
	SoumetsuKey  string
	BaseURL      string
	AvatarURL    string
	APIURL       string
	BanchoURL    string
	AvatarsPath  string
	BannersPath  string
}

// DatabaseConfig holds MySQL database configuration.
type DatabaseConfig struct {
	Host string
	Port int
	User string
	Pass string
	Name string
}

// DSN returns the database connection string.
func (c DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
		c.User,
		c.Pass,
		c.Host,
		c.Port,
		c.Name,
	)
}

// RedisConfig holds Redis configuration.
type RedisConfig struct {
	MaxConnections int
	NetworkType    string
	Host           string
	Port           int
	Pass           string
	DB             int
	UseSSL         bool
}

// Addr returns the Redis address string.
func (c RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// MailgunConfig holds email service configuration.
type MailgunConfig struct {
	Domain    string
	APIKey    string
	PublicKey string
	From      string
}

// DiscordConfig holds Discord integration configuration.
type DiscordConfig struct {
	ServerURL       string
	AppClientID     string
	AppClientSecret string
	UserLookupURL   string
}

// BeatmapConfig holds beatmap mirror configuration.
type BeatmapConfig struct {
	MirrorAPIURL      string
	DownloadMirrorURL string
}

// SecurityConfig holds security-related configuration.
type SecurityConfig struct {
	RecaptchaSiteKey   string
	RecaptchaSecretKey string
	IPLookupURL        string
	PayPalEmail        string
}

// Load reads configuration from environment variables.
// It attempts to load a .env file from multiple locations.
func Load() (*Config, error) {
	loadEnvFile()

	cfg := &Config{
		App: AppConfig{
			Port:         mustEnvInt("SOUMETSU_PORT"),
			Env:          mustEnv("SOUMETSU_ENV"),
			CookieSecret: mustEnv("SOUMETSU_COOKIE_SECRET"),
			SoumetsuKey:  mustEnv("SOUMETSU_KEY"),
			BaseURL:      mustEnv("SOUMETSU_BASE_URL"),
			AvatarURL:    mustEnv("SOUMETSU_AVATAR_URL"),
			APIURL:       mustEnv("SOUMETSU_API_URL"),
			BanchoURL:    mustEnv("SOUMETSU_BANCHO_URL"),
			AvatarsPath:  mustEnv("SOUMETSU_INTERNAL_AVATARS_PATH"),
			BannersPath:  mustEnv("SOUMETSU_INTERNAL_BANNERS_PATH"),
		},
		Database: DatabaseConfig{
			Host: mustEnv("MYSQL_HOST"),
			Port:   mustEnvInt("MYSQL_TCP_PORT"),
			User:   mustEnv("MYSQL_USER"),
			Pass:   mustEnv("MYSQL_PASSWORD"),
			Name:   mustEnv("MYSQL_DATABASE"),
		},
		Redis: RedisConfig{
			MaxConnections: mustEnvInt("REDIS_MAX_CONNECTIONS"),
			NetworkType:    mustEnv("REDIS_NETWORK_TYPE"),
			Host:           mustEnv("REDIS_HOST"),
			Port:           mustEnvInt("REDIS_PORT"),
			Pass:           mustEnv("REDIS_PASS"),
			DB:             mustEnvInt("REDIS_DB"),
			UseSSL:         mustEnvBool("REDIS_USE_SSL"),
		},
		Mailgun: MailgunConfig{
			Domain:    mustEnv("MAILGUN_DOMAIN"),
			APIKey:    mustEnv("MAILGUN_API_KEY"),
			PublicKey: mustEnv("MAILGUN_PUBLIC_KEY"),
			From:      mustEnv("MAILGUN_FROM"),
		},
		Discord: DiscordConfig{
			ServerURL:       mustEnv("DISCORD_SERVER_URL"),
			AppClientID:     mustEnv("DISCORD_APP_CLIENT_ID"),
			AppClientSecret: mustEnv("DISCORD_APP_CLIENT_SECRET"),
			UserLookupURL:   mustEnv("DISCORD_USER_LOOKUP_URL"),
		},
		Beatmap: BeatmapConfig{
			MirrorAPIURL:      mustEnv("SOUMETSU_BEATMAP_MIRROR_API_URL"),
			DownloadMirrorURL: mustEnv("SOUMETSU_BEATMAP_DOWNLOAD_MIRROR_URL"),
		},
		Security: SecurityConfig{
			RecaptchaSiteKey:   mustEnv("RECAPTCHA_SITE_KEY"),
			RecaptchaSecretKey: mustEnv("RECAPTCHA_SECRET_KEY"),
			IPLookupURL:        mustEnv("IP_LOOKUP_URL"),
			PayPalEmail:        mustEnv("PAYPAL_EMAIL_ADDRESS"),
		},
	}

	return cfg, nil
}

// loadEnvFile attempts to load .env from multiple locations.
func loadEnvFile() {
	// Try current working directory
	if err := godotenv.Load(); err == nil {
		slog.Info("Loaded .env from current directory")
		return
	}

	// Try executable's directory
	exe, err := os.Executable()
	if err == nil {
		exe, err = filepath.EvalSymlinks(exe)
		if err == nil {
			exeDir := filepath.Dir(exe)
			envPath := filepath.Join(exeDir, ".env")
			if err := godotenv.Load(envPath); err == nil {
				slog.Info("Loaded .env from executable directory", "path", envPath)
				return
			}
		}
	}

	// Try source directory (for development)
	wd, err := os.Getwd()
	if err == nil {
		envPath := filepath.Join(wd, ".env")
		if _, err := os.Stat(envPath); err == nil {
			if err := godotenv.Load(envPath); err == nil {
				slog.Info("Loaded .env from working directory", "path", envPath)
				return
			}
		}
	}

	slog.Warn("No .env file found, using environment variables only")
}

func mustEnv(key string) string {
	val, exists := os.LookupEnv(key)
	if !exists {
		panic("Missing environment variable: " + key)
	}
	return val
}

func mustEnvInt(key string) int {
	val := mustEnv(key)
	i, err := strconv.Atoi(val)
	if err != nil {
		panic(fmt.Sprintf("Invalid integer for %s: %s", key, val))
	}
	return i
}

func mustEnvBool(key string) bool {
	val := mustEnv(key)
	b, err := strconv.ParseBool(val)
	if err != nil {
		panic(fmt.Sprintf("Invalid boolean for %s: %s", key, val))
	}
	return b
}
