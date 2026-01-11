// Package crypto provides cryptographic utilities for password hashing and token generation.
package crypto

import (
	"crypto/md5"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// MD5 returns the MD5 hash of a string as a hex string.
func MD5(s string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(s)))
}

// HashPassword hashes a password using bcrypt.
// The password is first MD5 hashed (for legacy compatibility), then bcrypt hashed.
func HashPassword(password string) (string, error) {
	md5Hash := MD5(password)
	hash, err := bcrypt.GenerateFromPassword([]byte(md5Hash), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword checks if a password matches a bcrypt hash.
// The password is first MD5 hashed (for legacy compatibility), then compared.
func VerifyPassword(password, hash string) bool {
	md5Hash := MD5(password)
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(md5Hash))
	return err == nil
}

// GenerateRandomString generates a random alphanumeric string of the specified length.
func GenerateRandomString(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	for i := range b {
		b[i] = charset[int(b[i])%len(charset)]
	}
	return string(b), nil
}

// GenerateRandomHex generates a random hex string of the specified byte length.
func GenerateRandomHex(byteLength int) (string, error) {
	b := make([]byte, byteLength)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// GenerateToken generates a secure random token (32 hex characters).
func GenerateToken() (string, error) {
	return GenerateRandomHex(16)
}

// GenerateInviteCode generates a random invite code (8 characters).
func GenerateInviteCode() (string, error) {
	return GenerateRandomString(8)
}

// GeneratePasswordResetKey generates a password reset key (64 hex characters).
func GeneratePasswordResetKey() (string, error) {
	return GenerateRandomHex(32)
}

// GenerateLogoutKey generates a logout key for session validation.
func GenerateLogoutKey() string {
	key, _ := GenerateRandomHex(16)
	return key
}
