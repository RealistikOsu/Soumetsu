package config

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Discord  DiscordConfig
	Beatmap  BeatmapConfig
	Security SecurityConfig
}

type AppConfig struct {
	Port          int
	Env           string
	CookieSecret  string
	SoumetsuKey   string
	BaseURL       string
	AvatarURL     string
	APIURL        string
	BrowserAPIURL string
	BanchoURL     string
	AvatarsPath   string
	BannersPath   string
}

type DatabaseConfig struct {
	Host string
	Port int
	User string
	Pass string
	Name string
}

func (c DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
		c.User,
		c.Pass,
		c.Host,
		c.Port,
		c.Name,
	)
}

type RedisConfig struct {
	MaxConnections int
	NetworkType    string
	Host           string
	Port           int
	Pass           string
	DB             int
	UseSSL         bool
}

func (c RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

type DiscordConfig struct {
	ServerURL       string
	AppClientID     string
	AppClientSecret string
	UserLookupURL   string
}

type BeatmapConfig struct {
	MirrorAPIURL      string
	DownloadMirrorURL string
}

type SecurityConfig struct {
	RecaptchaSiteKey   string
	RecaptchaSecretKey string
	IPLookupURL        string
	PayPalEmail        string
}

func Load() (*Config, error) {
	loadEnvFile()

	cfg := &Config{
		App: AppConfig{
			Port:          mustEnvInt("SOUMETSU_PORT"),
			Env:           mustEnv("SOUMETSU_ENV"),
			CookieSecret:  mustEnv("SOUMETSU_COOKIE_SECRET"),
			SoumetsuKey:   mustEnv("SOUMETSU_KEY"),
			BaseURL:       mustEnv("SOUMETSU_BASE_URL"),
			AvatarURL:     mustEnv("SOUMETSU_AVATAR_URL"),
			APIURL:        mustEnv("SOUMETSU_API_URL"),
			BrowserAPIURL: optionalEnv("SOUMETSU_BROWSER_API_URL", mustEnv("SOUMETSU_API_URL")),
			BanchoURL:     mustEnv("SOUMETSU_BANCHO_URL"),
			AvatarsPath:   mustEnv("SOUMETSU_INTERNAL_AVATARS_PATH"),
			BannersPath:   mustEnv("SOUMETSU_INTERNAL_BANNERS_PATH"),
		},
		Database: DatabaseConfig{
			Host: mustEnv("MYSQL_HOST"),
			Port: mustEnvInt("MYSQL_TCP_PORT"),
			User: mustEnv("MYSQL_USER"),
			Pass: mustEnv("MYSQL_PASSWORD"),
			Name: mustEnv("MYSQL_DATABASE"),
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

func loadEnvFile() {
	if err := godotenv.Load(); err == nil {
		slog.Info("Loaded .env from current directory")
		return
	}

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

func optionalEnv(key string, fallback string) string {
	val, exists := os.LookupEnv(key)
	if !exists {
		return fallback
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
