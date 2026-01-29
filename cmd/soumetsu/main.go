package main

import (
	"context"
	"encoding/gob"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	slog.Info("Initialising application...")
	application, err := app.New(cfg)
	if err != nil {
		slog.Error("Failed to initialise application", "error", err)
		panic(err)
	}

	slog.Info("Setting up routes...")
	router := application.Routes()

	addr := fmt.Sprintf(":%d", cfg.App.Port)
	server := &http.Server{
		Addr:    addr,
		Handler: router,
	}

	shutdownComplete := make(chan struct{})
	go func() {
		sigint := make(chan os.Signal, 1)
		signal.Notify(sigint, os.Interrupt, syscall.SIGTERM)
		sig := <-sigint

		slog.Info("Received shutdown signal", "signal", sig)

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		slog.Info("Shutting down HTTP server...")
		if err := server.Shutdown(ctx); err != nil {
			slog.Error("HTTP server shutdown error", "error", err)
		}

		slog.Info("Closing application resources...")
		if err := application.Close(); err != nil {
			slog.Error("Application close error", "error", err)
		}

		close(shutdownComplete)
	}()

	slog.Info("Starting HTTP server", "address", addr)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		slog.Error("HTTP server error", "error", err)
		panic(err)
	}

	<-shutdownComplete
	slog.Info("Shutdown complete")
}
