package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"time"

	"github.com/thehowl/cieca"
)

// CSRFService defines the CSRF service interface.
type CSRFService interface {
	Generate(userID int) (string, error)
	Validate(userID int, key string) (bool, error)
}

// CiecaCSRF implements CSRF protection using cieca as the backend storage.
type CiecaCSRF struct {
	store *cieca.DataStore
}

// NewCSRFService creates a new CSRF service using cieca.
func NewCSRFService() CSRFService {
	return &CiecaCSRF{
		store: &cieca.DataStore{},
	}
}

// Generate generates a new CSRF token for a user.
func (c *CiecaCSRF) Generate(userID int) (string, error) {
	token, err := generateToken(32)
	if err != nil {
		return "", err
	}

	// Store token with 1 hour expiration
	key := "csrf:" + strconv.Itoa(userID)
	c.store.SetWithExpiration(key, []byte(token), time.Hour)

	return token, nil
}

// Validate validates a CSRF token for a user.
func (c *CiecaCSRF) Validate(userID int, key string) (bool, error) {
	if key == "" {
		return false, nil
	}

	storeKey := "csrf:" + strconv.Itoa(userID)
	storedToken := c.store.Get(storeKey)
	if storedToken == nil {
		return false, nil
	}

	return string(storedToken) == key, nil
}

// generateToken generates a random hex token.
func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
