package middleware

import (
	"fmt"
	"time"

	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/thehowl/cieca"
)

// CSRFService defines the CSRF service interface.
type CSRFService interface {
	Generate(userID int) (string, error)
	Validate(userID int, key string) (bool, error)
}

// CiecaCSRF wraps cieca for CSRF protection.
type CiecaCSRF struct {
	store *cieca.DataStore
	ttl   time.Duration
}

// NewCSRFService creates a new CSRF service using cieca.
func NewCSRFService() CSRFService {
	return &CiecaCSRF{
		store: &cieca.DataStore{},
		ttl:   30 * time.Minute,
	}
}

// Generate generates a new CSRF token for a user.
func (c *CiecaCSRF) Generate(userID int) (string, error) {
	token, err := crypto.GenerateToken()
	if err != nil {
		return "", err
	}
	c.store.SetWithExpiration(c.storeKey(userID), []byte(token), c.ttl)
	return token, nil
}

// Validate validates a CSRF token for a user.
func (c *CiecaCSRF) Validate(userID int, key string) (bool, error) {
	val, ok := c.store.GetWithExist(c.storeKey(userID))
	if !ok {
		return false, nil
	}
	if string(val) != key {
		return false, nil
	}
	c.store.Delete(c.storeKey(userID))
	return true, nil
}

func (c *CiecaCSRF) storeKey(userID int) string {
	return fmt.Sprintf("csrf:%d", userID)
}
