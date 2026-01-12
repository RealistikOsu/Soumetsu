package main

import (
	"encoding/gob"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/RealistikOsu/soumetsu/internal/app"
	"github.com/RealistikOsu/soumetsu/internal/config"
	"github.com/RealistikOsu/soumetsu/internal/models"
)

var version = "dev"

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	slog.Info("Soumetsu service starting up", "version", version)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		panic(err)
	}

	gob.Register([]models.Message{})
	gob.Register(&models.ErrorMessage{})
	gob.Register(&models.InfoMessage{})
	gob.Register(&models.NeutralMessage{})
	gob.Register(&models.WarningMessage{})
	gob.Register(&models.SuccessMessage{})

	slog.Info("Initializing application...")
	application, err := app.New(cfg)
	if err != nil {
		slog.Error("Failed to initialize application", "error", err)
		panic(err)
	}

	slog.Info("Setting up routes...")
	router := application.Routes()

	addr := fmt.Sprintf(":%d", cfg.App.Port)
	slog.Info("Starting HTTP server", "address", addr)

	if err := http.ListenAndServe(addr, router); err != nil {
		slog.Error("Failed to start server", "error", err)
		panic(err)
	}
}
