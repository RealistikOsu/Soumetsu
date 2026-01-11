// Package validation provides input validation utilities.
package validation

import (
	"regexp"
	"strings"
	"unicode"
)

// Common password list (top 100 most common passwords 8+ chars).
// This is a subset for the package; full list can be loaded from file.
var commonPasswords = map[string]struct{}{
	"password":    {},
	"12345678":    {},
	"123456789":   {},
	"1234567890":  {},
	"qwertyuiop":  {},
	"iloveyou":    {},
	"trustno1":    {},
	"baseball":    {},
	"football":    {},
	"starwars":    {},
	"superman":    {},
	"1qaz2wsx":    {},
	"jennifer":    {},
	"sunshine":    {},
	"computer":    {},
	"michelle":    {},
	"11111111":    {},
	"princess":    {},
	"987654321":   {},
	"corvette":    {},
	"1234qwer":    {},
	"88888888":    {},
	"internet":    {},
	"samantha":    {},
	"whatever":    {},
	"maverick":    {},
	"steelers":    {},
	"mercedes":    {},
	"123123123":   {},
	"qwer1234":    {},
	"hardcore":    {},
	"q1w2e3r4":    {},
	"midnight":    {},
	"bigdaddy":    {},
	"victoria":    {},
	"1q2w3e4r":    {},
	"cocacola":    {},
	"marlboro":    {},
	"asdfasdf":    {},
	"87654321":    {},
	"password1":   {},
	"password123": {},
	"abc12345":    {},
	"abcd1234":    {},
	"qwerty123":   {},
	"letmein1":    {},
	"welcome1":    {},
	"monkey123":   {},
	"dragon123":   {},
	"master123":   {},
}

// PasswordError represents a password validation error.
type PasswordError string

func (e PasswordError) Error() string {
	return string(e)
}

const (
	ErrPasswordTooShort  PasswordError = "Your password is too short! It must be at least 8 characters long."
	ErrPasswordTooCommon PasswordError = "Your password is one of the most common passwords on the entire internet. No way we're letting you use that!"
)

// ValidatePassword checks if a password meets security requirements.
// Returns nil if valid, or a PasswordError if invalid.
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}

	// Check against common passwords
	lower := strings.ToLower(password)
	if _, exists := commonPasswords[lower]; exists {
		return ErrPasswordTooCommon
	}

	return nil
}

// ValidatePasswordStrength returns a more detailed password strength check.
// Returns an error message string (empty if password is acceptable).
func ValidatePasswordStrength(password string) string {
	if len(password) < 8 {
		return string(ErrPasswordTooShort)
	}

	lower := strings.ToLower(password)
	if _, exists := commonPasswords[lower]; exists {
		return string(ErrPasswordTooCommon)
	}

	return ""
}

// AddCommonPassword adds a password to the common passwords list.
// Used when loading additional passwords from a file.
func AddCommonPassword(password string) {
	commonPasswords[strings.ToLower(password)] = struct{}{}
}

// LoadCommonPasswords adds multiple passwords to the common passwords list.
func LoadCommonPasswords(passwords []string) {
	for _, p := range passwords {
		commonPasswords[strings.ToLower(p)] = struct{}{}
	}
}

// Username validation patterns.
var (
	UsernamePattern     = regexp.MustCompile(`^[A-Za-z0-9 _\[\]-]{2,15}$`)
	UsernamePatternSafe = regexp.MustCompile(`^[a-z0-9_-]{2,15}$`)
	ClanNamePattern     = regexp.MustCompile(`^[A-Za-z0-9 '_\[\]-]{2,15}$`)
	ClanTagPattern      = regexp.MustCompile(`^[A-Za-z0-9]{2,6}$`)
)

// ValidateUsername checks if a username is valid.
func ValidateUsername(username string) bool {
	return UsernamePattern.MatchString(username)
}

// SafeUsername converts a username to its safe (lowercase, no spaces) form.
func SafeUsername(username string) string {
	safe := strings.ToLower(username)
	safe = strings.ReplaceAll(safe, " ", "_")
	return safe
}

// ValidateClanName checks if a clan name is valid.
func ValidateClanName(name string) bool {
	return ClanNamePattern.MatchString(name)
}

// ValidateClanTag checks if a clan tag is valid.
func ValidateClanTag(tag string) bool {
	return ClanTagPattern.MatchString(tag)
}

// IsAlphanumeric checks if a string contains only letters and numbers.
func IsAlphanumeric(s string) bool {
	for _, r := range s {
		if !unicode.IsLetter(r) && !unicode.IsNumber(r) {
			return false
		}
	}
	return true
}

// HexColorPattern matches valid hex color codes.
var HexColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// ValidateHexColor checks if a string is a valid hex color.
func ValidateHexColor(color string) bool {
	return HexColorPattern.MatchString(color)
}
