package validation

import (
	"regexp"
	"strings"
	"unicode"
)

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

type PasswordError string

func (e PasswordError) Error() string {
	return string(e)
}

const (
	ErrPasswordTooShort  PasswordError = "Your password is too short! It must be at least 8 characters long."
	ErrPasswordTooCommon PasswordError = "Your password is one of the most common passwords on the entire internet. No way we're letting you use that!"
)

func ValidatePassword(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}

	lower := strings.ToLower(password)
	if _, exists := commonPasswords[lower]; exists {
		return ErrPasswordTooCommon
	}

	return nil
}

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

func AddCommonPassword(password string) {
	commonPasswords[strings.ToLower(password)] = struct{}{}
}

func LoadCommonPasswords(passwords []string) {
	for _, p := range passwords {
		commonPasswords[strings.ToLower(p)] = struct{}{}
	}
}

var (
	UsernamePattern     = regexp.MustCompile(`^[A-Za-z0-9 _\[\]-]{2,15}$`)
	UsernamePatternSafe = regexp.MustCompile(`^[a-z0-9_-]{2,15}$`)
	ClanNamePattern     = regexp.MustCompile(`^[A-Za-z0-9 '_\[\]-]{2,15}$`)
	ClanTagPattern      = regexp.MustCompile(`^[A-Za-z0-9]{2,6}$`)
)

func ValidateUsername(username string) bool {
	return UsernamePattern.MatchString(username)
}

func SafeUsername(username string) string {
	safe := strings.ToLower(username)
	safe = strings.ReplaceAll(safe, " ", "_")
	return safe
}

func ValidateClanName(name string) bool {
	return ClanNamePattern.MatchString(name)
}

func ValidateClanTag(tag string) bool {
	return ClanTagPattern.MatchString(tag)
}

func IsAlphanumeric(s string) bool {
	for _, r := range s {
		if !unicode.IsLetter(r) && !unicode.IsNumber(r) {
			return false
		}
	}
	return true
}

var HexColorPattern = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

func ValidateHexColor(color string) bool {
	return HexColorPattern.MatchString(color)
}
