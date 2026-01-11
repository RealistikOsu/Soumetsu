package state

import (
	"log/slog"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

func getEnv(key string) string {
	val, exists := os.LookupEnv(key)
	if !exists {
		panic("Missing environment variable: " + key)
	}
	return val
}

func strToInt(s string) int {
	val, _ := strconv.Atoi(s)
	return val
}

func strToBool(s string) bool {
	val, _ := strconv.ParseBool(s)
	return val
}

type Settings struct {
	SOUMETSU_PORT          int
	SOUMETSU_COOKIE_SECRET string
	SOUMETSU_KEY    string

	SOUMETSU_ENV string

	SOUMETSU_INTERNAL_AVATARS_PATH string
	SOUMETSU_INTERNAL_BANNERS_PATH string

	SOUMETSU_BASE_URL   string
	SOUMETSU_AVATAR_URL string
	SOUMETSU_API_URL    string
	SOUMETSU_BANCHO_URL string

	SOUMETSU_BEATMAP_MIRROR_API_URL      string
	SOUMETSU_BEATMAP_DOWNLOAD_MIRROR_URL string

	DISCORD_SERVER_URL string

	DISCORD_APP_CLIENT_ID     string
	DISCORD_APP_CLIENT_SECRET string

	MYSQL_HOST            string
	MYSQL_TCP_PORT        int
	MYSQL_ROOT_PASSWORD   string
	MYSQL_DATABASE        string
	MYSQL_USER            string
	MYSQL_PASSWORD        string

	REDIS_MAX_CONNECTIONS int
	REDIS_NETWORK_TYPE    string
	REDIS_HOST            string
	REDIS_PORT            int
	REDIS_PASS            string
	REDIS_DB              int
	REDIS_USE_SSL         bool

	MAILGUN_DOMAIN     string
	MAILGUN_API_KEY    string
	MAILGUN_PUBLIC_KEY string
	MAILGUN_FROM       string

	RECAPTCHA_SITE_KEY   string
	RECAPTCHA_SECRET_KEY string

	IP_LOOKUP_URL           string
	DISCORD_USER_LOOKUP_URL string

	PAYPAL_EMAIL_ADDRESS string
}

var settings = Settings{}

func LoadSettings() Settings {
	// Try multiple locations for .env file
	envLoaded := false
	
	// 1. Try current working directory
	if err := godotenv.Load(); err == nil {
		envLoaded = true
		slog.Info("Loaded .env from current directory")
	} else {
		// 2. Try executable's directory
		exe, err := os.Executable()
		if err == nil {
			// Resolve symlinks to get actual path
			exe, err = filepath.EvalSymlinks(exe)
			if err == nil {
				exeDir := filepath.Dir(exe)
				envPath := filepath.Join(exeDir, ".env")
				if err := godotenv.Load(envPath); err == nil {
					envLoaded = true
					slog.Info("Loaded .env from executable directory", "path", envPath)
				}
			}
		}
		
		// 3. Try source directory (for development)
		wd, err := os.Getwd()
		if err == nil {
			envPath := filepath.Join(wd, ".env")
			if _, err := os.Stat(envPath); err == nil {
				if err := godotenv.Load(envPath); err == nil {
					envLoaded = true
					slog.Info("Loaded .env from working directory", "path", envPath)
				}
			}
		}
	}
	
	if !envLoaded {
		slog.Warn("No .env file found, using environment variables only")
	}

	settings.SOUMETSU_PORT = strToInt(getEnv("SOUMETSU_PORT"))
	settings.SOUMETSU_COOKIE_SECRET = getEnv("SOUMETSU_COOKIE_SECRET")
	settings.SOUMETSU_KEY = getEnv("SOUMETSU_KEY")

	settings.SOUMETSU_ENV = getEnv("SOUMETSU_ENV")

	settings.SOUMETSU_INTERNAL_AVATARS_PATH = getEnv("SOUMETSU_INTERNAL_AVATARS_PATH")
	settings.SOUMETSU_INTERNAL_BANNERS_PATH = getEnv("SOUMETSU_INTERNAL_BANNERS_PATH")

	settings.SOUMETSU_BASE_URL = getEnv("SOUMETSU_BASE_URL")
	settings.SOUMETSU_AVATAR_URL = getEnv("SOUMETSU_AVATAR_URL")
	settings.SOUMETSU_API_URL = getEnv("SOUMETSU_API_URL")
	settings.SOUMETSU_BANCHO_URL = getEnv("SOUMETSU_BANCHO_URL")

	settings.SOUMETSU_BEATMAP_MIRROR_API_URL = getEnv("SOUMETSU_BEATMAP_MIRROR_API_URL")
	settings.SOUMETSU_BEATMAP_DOWNLOAD_MIRROR_URL = getEnv("SOUMETSU_BEATMAP_DOWNLOAD_MIRROR_URL")

	settings.DISCORD_SERVER_URL = getEnv("DISCORD_SERVER_URL")

	settings.DISCORD_APP_CLIENT_ID = getEnv("DISCORD_APP_CLIENT_ID")
	settings.DISCORD_APP_CLIENT_SECRET = getEnv("DISCORD_APP_CLIENT_SECRET")

	settings.MYSQL_HOST = getEnv("MYSQL_HOST")
	settings.MYSQL_TCP_PORT = strToInt(getEnv("MYSQL_TCP_PORT"))
	settings.MYSQL_ROOT_PASSWORD = getEnv("MYSQL_ROOT_PASSWORD")
	settings.MYSQL_DATABASE = getEnv("MYSQL_DATABASE")
	settings.MYSQL_USER = getEnv("MYSQL_USER")
	settings.MYSQL_PASSWORD = getEnv("MYSQL_PASSWORD")

	settings.REDIS_MAX_CONNECTIONS = strToInt(getEnv("REDIS_MAX_CONNECTIONS"))
	settings.REDIS_NETWORK_TYPE = getEnv("REDIS_NETWORK_TYPE")
	settings.REDIS_HOST = getEnv("REDIS_HOST")
	settings.REDIS_PORT = strToInt(getEnv("REDIS_PORT"))
	settings.REDIS_PASS = getEnv("REDIS_PASS")
	settings.REDIS_DB = strToInt(getEnv("REDIS_DB"))
	settings.REDIS_USE_SSL = strToBool(getEnv("REDIS_USE_SSL"))

	settings.MAILGUN_DOMAIN = getEnv("MAILGUN_DOMAIN")
	settings.MAILGUN_API_KEY = getEnv("MAILGUN_API_KEY")
	settings.MAILGUN_PUBLIC_KEY = getEnv("MAILGUN_PUBLIC_KEY")
	settings.MAILGUN_FROM = getEnv("MAILGUN_FROM")

	settings.RECAPTCHA_SITE_KEY = getEnv("RECAPTCHA_SITE_KEY")
	settings.RECAPTCHA_SECRET_KEY = getEnv("RECAPTCHA_SECRET_KEY")

	settings.IP_LOOKUP_URL = getEnv("IP_LOOKUP_URL")
	settings.DISCORD_USER_LOOKUP_URL = getEnv("DISCORD_USER_LOOKUP_URL")

	settings.PAYPAL_EMAIL_ADDRESS = getEnv("PAYPAL_EMAIL_ADDRESS")

	return settings
}

func GetSettings() Settings {
	return settings
}
