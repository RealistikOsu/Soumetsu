package middleware

import (
	"log/slog"
	"net/http"
	"time"

	apicontext "github.com/RealistikOsu/soumetsu/internal/api/context"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func StructuredLogger() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := newResponseWriter(w)

			next.ServeHTTP(rw, r)

			latency := time.Since(start)

			slog.Info("HTTP request",
				"status", rw.statusCode,
				"method", r.Method,
				"path", r.URL.Path,
				"latency_ms", latency.Milliseconds(),
				"client_ip", apicontext.ClientIP(r),
			)
		})
	}
}
