package main

// about using johnniedoe/contrib/gzip:
// johnniedoe's fork fixes a critical issue for which .String resulted in
// an ERR_DECODING_FAILED. This is an actual pull request on the contrib
// repo, but apparently, gin is dead.

import (
	"encoding/gob"
	"fmt"
	"log/slog"
	"os"
	"sort"
	"strconv"
	"time"

	"math/rand"

	"github.com/RealistikOsu/soumetsu/routers/pagemappings"
	"github.com/RealistikOsu/soumetsu/services"
	"github.com/RealistikOsu/soumetsu/services/cieca"
	"github.com/RealistikOsu/soumetsu/state"
	"github.com/fatih/structs"
	"github.com/gin-gonic/contrib/sessions"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/johnniedoe/contrib/gzip"
	"github.com/thehowl/qsql"
	gintrace "gopkg.in/DataDog/dd-trace-go.v1/contrib/gin-gonic/gin"
	"gopkg.in/mailgun/mailgun-go.v1"
	"gopkg.in/redis.v5"
)

// Services etc
var (
	configMap map[string]interface{}

	CSRF services.CSRF
	db   *sqlx.DB
	qb   *qsql.DB
	mg   mailgun.Mailgun
	rd   *redis.Client
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	slog.SetDefault(logger)

	slog.Info("soumetsu service starting up on", "version", version)

	settings := state.LoadSettings()
	configMap = structs.Map(settings)

	// initialise db
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
		settings.DB_USER,
		settings.DB_PASS,
		settings.DB_HOST,
		settings.DB_PORT,
		settings.DB_NAME,
	)

	// initialise db
	var err error
	db, err = sqlx.Open(settings.DB_SCHEME, dsn)
	if err != nil {
		panic(err)
	}
	qb = qsql.New(db.DB)

	// set it to random
	rand.Seed(time.Now().Unix())

	// initialise mailgun
	mg = mailgun.NewMailgun(
		settings.MAILGUN_DOMAIN,
		settings.MAILGUN_API_KEY,
		settings.MAILGUN_PUBLIC_KEY,
	)

	// initialise CSRF service
	CSRF = cieca.NewCSRF()

	if gin.Mode() == gin.DebugMode {
		slog.Info("Development environment detected. Starting fsnotify on template folder...")
		err := reloader()
		if err != nil {
			slog.Error("Failed to start template reload watcher", "error", err.Error())
		}
	}

	// initialise redis
	rd = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", settings.REDIS_HOST, settings.REDIS_PORT),
		Password: settings.REDIS_PASS,
		DB:       settings.REDIS_DB,
	})

	// even if it's not release, we say that it's release
	// so that gin doesn't spam
	gin.SetMode(gin.ReleaseMode)

	gobRegisters := []interface{}{
		[]message{},
		errorMessage{},
		infoMessage{},
		neutralMessage{},
		warningMessage{},
		successMessage{},
	}
	for _, el := range gobRegisters {
		gob.Register(el)
	}

	slog.Info("Importing templates...")
	loadTemplates("")

	slog.Info("Setting up rate limiter...")
	setUpLimiter()

	r := generateEngine()
	slog.Info("Listening on port", "port", settings.APP_PORT)

	err = r.Run(fmt.Sprintf(":%d", settings.APP_PORT))
	if err != nil {
		slog.Error("Failed to start server", "error", err.Error())
		panic(err)
	}
}

func generateEngine() *gin.Engine {
	slog.Info("Starting session system...")
	settings := state.GetSettings()
	var store sessions.Store
	var err error
	if settings.REDIS_MAX_CONNECTIONS != 0 {
		store, err = sessions.NewRedisStore(
			settings.REDIS_MAX_CONNECTIONS,
			settings.REDIS_NETWORK_TYPE,
			fmt.Sprintf("%s:%d", settings.REDIS_HOST, settings.REDIS_PORT),
			settings.REDIS_PASS,
			[]byte(settings.APP_COOKIE_SECRET),
		)
	} else {
		store = sessions.NewCookieStore([]byte(settings.APP_COOKIE_SECRET))
	}

	if err != nil {
		slog.Error("Failed to crreate redis store", "error", err.Error())
		panic(err)
	}

	r := gin.Default()

	r.Use(
		// Use our custom logger
		services.StructuredLogger(),
		// Still use the built-in recovery middleware that is called with default
		gin.Recovery(),
		gzip.Gzip(gzip.DefaultCompression),
		pagemappings.CheckRedirect,
		sessions.Sessions("session", store),
		sessionInitializer(),
		rateLimiter(false),
		gintrace.Middleware("soumetsu"),
	)

	r.Static("/static", "static")
	r.StaticFile("/favicon.ico", "static/favicon.ico")

	r.POST("/login", loginSubmit)
	r.GET("/logout", logout)

	r.GET("/register", register)
	r.POST("/register", registerSubmit)
	r.GET("/register/verify", verifyAccount)
	r.GET("/register/welcome", welcome)

	r.GET("/clans/create", ccreate)
	r.POST("/clans/create", ccreateSubmit)

	r.GET("/users/:user", userProfile)
	r.GET("/u/:user", func(c *gin.Context) {
		user := c.Param("user")
		c.Redirect(301, "/users/"+user)
	})

	r.GET("/rank_request", func(c *gin.Context) {
		c.Redirect(301, "/rank-request")
	})

	// Redirectors to our old /rx/u /ap/u routes.
	r.GET("/rx/u/:user", func(c *gin.Context) {
		user := c.Param("user")
		c.Redirect(301, "/u/"+user+"?rx=1")
	})
	r.GET("/ap/u/:user", func(c *gin.Context) {
		user := c.Param("user")
		c.Redirect(301, "/u/"+user+"?rx=2")
	})

	r.GET("/b/:bid", func(c *gin.Context) {
		bid := c.Param("bid")
		c.Redirect(301, "/beatmaps/"+bid)
	})

	r.GET("/beatmapsets/:bsetid", func(c *gin.Context) {
		bsetid := c.Param("bsetid")
		data, err := getBeatmapSetData(bsetid)

		if err != nil {
			return
		}

		sort.Slice(data.ChildrenBeatmaps, func(i, j int) bool {
			if data.ChildrenBeatmaps[i].Mode != data.ChildrenBeatmaps[j].Mode {
				return data.ChildrenBeatmaps[i].Mode < data.ChildrenBeatmaps[j].Mode
			}
			return data.ChildrenBeatmaps[i].DifficultyRating < data.ChildrenBeatmaps[j].DifficultyRating
		})

		c.Redirect(301, "/beatmaps/"+strconv.Itoa(data.ChildrenBeatmaps[len(data.ChildrenBeatmaps)-1].ID))
	})

	// Modern clan routes
	r.GET("/clans/:id", clanPage)
	r.POST("/clans/:id/leave", leaveClan)

	// Legacy clan route redirects
	r.GET("/c/:cid", func(c *gin.Context) {
		cid := c.Param("cid")
		c.Redirect(301, "/clans/"+cid)
	})
	r.POST("/c/:cid", func(c *gin.Context) {
		cid := c.Param("cid")
		c.Redirect(307, "/clans/"+cid+"/leave")
	})

	r.GET("/beatmaps/:bid", beatmapInfo)

	// Modern password reset routes
	r.POST("/password-reset", passwordReset)
	r.GET("/password-reset/continue", passwordResetContinue)
	r.POST("/password-reset/continue", passwordResetContinueSubmit)

	// Legacy password reset route redirects
	r.POST("/pwreset", func(c *gin.Context) {
		c.Redirect(307, "/password-reset")
	})
	r.GET("/pwreset/continue", func(c *gin.Context) {
		k := c.Query("k")
		if k != "" {
			c.Redirect(301, "/password-reset/continue?k="+k)
		} else {
			c.Redirect(301, "/password-reset/continue")
		}
	})
	r.POST("/pwreset/continue", func(c *gin.Context) {
		c.Redirect(307, "/password-reset/continue")
	})

	r.GET("/settings/password", changePassword)
	r.POST("/settings/password", changePasswordSubmit)

	// Modern user page routes
	r.POST("/settings/user-page/parse", parseBBCode)

	// Legacy user page route redirects
	r.POST("/settings/userpage/parse", func(c *gin.Context) {
		c.Redirect(307, "/settings/user-page/parse")
	})

	r.POST("/settings/avatar", avatarSubmit)

	// Modern profile banner routes
	r.POST("/settings/profile-banner/:type", profBackground)

	// Legacy profile banner route redirects
	r.POST("/settings/profbanner/:type", func(c *gin.Context) {
		routeType := c.Param("type")
		c.Redirect(307, "/settings/profile-banner/"+routeType)
	})

	r.POST("/settings/change-username", changeUsername)

	// Modern Discord integration routes
	r.GET("/settings/discord/unlink", discordUnlink)
	r.GET("/settings/discord/redirect", discordRedirCheck)

	// Legacy Discord integration route redirects
	r.GET("/settings/discord-integration/unlink", func(c *gin.Context) {
		c.Redirect(301, "/settings/discord/unlink")
	})
	r.GET("/settings/discord-integration/redirect", func(c *gin.Context) {
		c.Redirect(301, "/settings/discord/redirect")
	})

	// Modern clan invite routes
	r.POST("/settings/clans/invite", createInvite)
	r.POST("/settings/clans/kick", clanKick)
	r.GET("/clans/invites/:inv", clanInvite)

	// Legacy clan invite route redirects
	r.POST("/settings/clan", func(c *gin.Context) {
		c.Redirect(307, "/settings/clans/invite")
	})
	r.POST("/settings/clansettings/k", func(c *gin.Context) {
		c.Redirect(307, "/settings/clans/kick")
	})
	r.GET("/clans/invite/:inv", func(c *gin.Context) {
		inv := c.Param("inv")
		c.Redirect(301, "/clans/invites/"+inv)
	})

	r.GET("/help", func(c *gin.Context) {
		c.Redirect(301, settings.DISCORD_SERVER_URL)
	})

	r.GET("/discord", func(c *gin.Context) {
		c.Redirect(301, settings.DISCORD_SERVER_URL)
	})

	// Legacy route redirects for renamed pages
	r.GET("/clanboard", func(c *gin.Context) {
		query := c.Request.URL.RawQuery
		if query != "" {
			c.Redirect(301, "/clans/leaderboard?"+query)
		} else {
			c.Redirect(301, "/clans/leaderboard")
		}
	})
	r.GET("/beatmap_listing", func(c *gin.Context) {
		c.Redirect(301, "/beatmaps")
	})
	r.GET("/connect", func(c *gin.Context) {
		c.Redirect(301, "/connection")
	})
	r.GET("/clan/manage", func(c *gin.Context) {
		c.Redirect(301, "/settings/clans/manage")
	})

	loadSimplePages(r)

	r.NoRoute(notFound)

	return r
}
