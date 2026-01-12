package crypto

import (
	"crypto/md5"
	"crypto/rand"
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
