package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"strconv"
	"time"

	"github.com/thehowl/cieca"
)

type CSRFService interface {
	Generate(userID int) (string, error)
	Validate(userID int, key string) (bool, error)
}

type CiecaCSRF struct {
	store *cieca.DataStore
}

func NewCSRFService() CSRFService {
	return &CiecaCSRF{
		store: &cieca.DataStore{},
	}
}

func (c *CiecaCSRF) Generate(userID int) (string, error) {
	token, err := generateToken(32)
	if err != nil {
		return "", err
	}

	key := "csrf:" + strconv.Itoa(userID)
	c.store.SetWithExpiration(key, []byte(token), time.Hour)

	return token, nil
}

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

func generateToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
