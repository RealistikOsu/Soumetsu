package crypto

import (
	"crypto/md5"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func MD5(s string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(s)))
}

func HashPassword(password string) (string, error) {
	md5Hash := MD5(password)
	hash, err := bcrypt.GenerateFromPassword([]byte(md5Hash), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func VerifyPassword(password, hash string) bool {
	md5Hash := MD5(password)
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(md5Hash))
	return err == nil
}

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

func GenerateRandomHex(byteLength int) (string, error) {
	b := make([]byte, byteLength)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func GenerateToken() (string, error) {
	return GenerateRandomHex(16)
}

func GenerateInviteCode() (string, error) {
	return GenerateRandomString(8)
}

func GeneratePasswordResetKey() (string, error) {
	return GenerateRandomHex(32)
}

func GenerateLogoutKey() string {
	key, _ := GenerateRandomHex(16)
	return key
}

// GenerateSessionVersion creates a random token for session validation
// This is used instead of password hashes to detect if a session should be invalidated
func GenerateSessionVersion() string {
	token, _ := GenerateRandomHex(32)
	return token
}

// HashSessionToken creates a SHA-256 hash of the session token for comparison
// This is more secure than MD5 for session validation
func HashSessionToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}
