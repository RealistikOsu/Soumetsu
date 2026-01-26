# Asset build stage - compile CSS and JS
FROM node:20-alpine AS assets

WORKDIR /build

COPY package.json package-lock.json* ./
RUN npm install

COPY gulpfile.js tailwind.config.js ./
COPY web/static/ ./web/static/
COPY web/templates/ ./web/templates/

RUN npx gulp build

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
COPY web/templates/*.go ./web/templates/

# Build the binary with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o soumetsu ./cmd/soumetsu

# Final stage - minimal runtime image
# Layers ordered from least to most frequently changing
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies (never changes)
RUN adduser -D -g '' appuser && \
    apk add --no-cache tzdata bash

# Copy the built binary (changes with Go code - infrequent)
COPY --chown=appuser:appuser --from=builder /build/soumetsu ./soumetsu

# Copy support files (rarely change)
COPY --chown=appuser:appuser scripts/ ./scripts/

# Copy templates (occasional changes)
COPY --chown=appuser:appuser web/templates/ ./web/templates/

# Copy static assets last (most frequent changes)
COPY --chown=appuser:appuser --from=assets /build/web/static/ ./web/static/

USER appuser

CMD ["/app/scripts/start.sh"]
