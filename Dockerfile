# Build stage - compile the Go binary
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git

# Copy dependency files first (cached unless go.mod/go.sum change)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy Go source code only (cached unless .go files change)
COPY cmd/ ./cmd/
COPY internal/ ./internal/

# Build the binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o soumetsu ./cmd/soumetsu

# Final stage - minimal runtime image
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache tzdata

# Create non-root user for security
RUN adduser -D -g '' appuser

# Copy the built binary from builder (rarely changes after initial build)
COPY --from=builder /build/soumetsu ./soumetsu

# Copy scripts (rarely change)
COPY scripts/ ./scripts/

# Copy data files (occasionally change)
COPY data/ ./data/

# Copy website docs (occasionally change)
COPY website-docs/ ./website-docs/

# Copy static assets (change more frequently)
COPY web/static/ ./web/static/

# Copy templates last (change most frequently)
COPY web/templates/ ./web/templates/

# Set ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

CMD ["./scripts/start.sh"]
