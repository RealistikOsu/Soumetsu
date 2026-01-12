# Build stage - compile the Go binary
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git

# Copy dependency files first (cached unless go.mod/go.sum change)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy Go source code only (cached unless .go files change)
COPY *.go ./
COPY modules/ ./modules/
COPY routers/ ./routers/
COPY services/ ./services/
COPY state/ ./state/

# Build the binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o soumetsu

# Final stage - minimal runtime image
FROM alpine:3.19

WORKDIR /srv/root

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
COPY static/ ./static/

# Copy templates last (change most frequently)
COPY templates/ ./templates/

# Set ownership
RUN chown -R appuser:appuser /srv/root

# Switch to non-root user
USER appuser

EXPOSE 80

CMD ["./scripts/start.sh"]
