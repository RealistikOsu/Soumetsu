package middleware

import (
	"github.com/thehowl/cieca"
)

// CSRFService defines the CSRF service interface.
type CSRFService interface {
	Generate(userID int) (string, error)
	Validate(userID int, key string) (bool, error)
}

// CiecaCSRF wraps cieca for CSRF protection.
type CiecaCSRF struct {
	*cieca.Cieca
}

// NewCSRFService creates a new CSRF service using cieca.
func NewCSRFService() CSRFService {
	return &CiecaCSRF{
		Cieca: cieca.NewCSRF(),
	}
}

// Generate generates a new CSRF token for a user.
func (c *CiecaCSRF) Generate(userID int) (string, error) {
	return c.Cieca.Generate(userID)
}

// Validate validates a CSRF token for a user.
func (c *CiecaCSRF) Validate(userID int, key string) (bool, error) {
	return c.Cieca.Validate(userID, key)
}
