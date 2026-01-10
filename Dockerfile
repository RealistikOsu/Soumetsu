FROM golang:1.21 AS builder

WORKDIR /srv/root

# Copy dependency files first (cached unless go.mod/go.sum change)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy only Go source files for building (cached unless .go files change)
COPY *.go ./
COPY modules/ ./modules/
COPY routers/ ./routers/
COPY services/ ./services/
COPY state/ ./state/

# Build the binary
RUN go build -o frontend

# Final stage
FROM golang:1.21

WORKDIR /srv/root

# Copy the built binary from builder
COPY --from=builder /srv/root/frontend ./frontend

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

EXPOSE 80

CMD ["./scripts/start.sh"]
