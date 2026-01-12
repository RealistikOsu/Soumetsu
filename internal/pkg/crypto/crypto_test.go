package crypto

import (
	"strings"
	"testing"
)

func TestMD5(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "empty string",
			input:    "",
			expected: "d41d8cd98f00b204e9800998ecf8427e",
		},
		{
			name:     "hello",
			input:    "hello",
			expected: "5d41402abc4b2a76b9719d911017c592",
		},
		{
			name:     "password",
			input:    "password",
			expected: "5f4dcc3b5aa765d61d8327deb882cf99",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := MD5(tt.input)
			if got != tt.expected {
				t.Errorf("MD5(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestHashPassword(t *testing.T) {
	password := "testpassword123"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	// Bcrypt hashes should start with $2a$ or $2b$
	if !strings.HasPrefix(hash, "$2") {
		t.Errorf("HashPassword() = %q, doesn't look like bcrypt hash", hash)
	}

	// Hash should be different from password
	if hash == password {
		t.Error("HashPassword() returned same as input")
	}

	// Hash length should be 60 characters for bcrypt
	if len(hash) != 60 {
		t.Errorf("HashPassword() length = %d, want 60", len(hash))
	}
}

func TestVerifyPassword(t *testing.T) {
	password := "testpassword123"
	wrongPassword := "wrongpassword"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	tests := []struct {
		name     string
		password string
		hash     string
		want     bool
	}{
		{
			name:     "correct password",
			password: password,
			hash:     hash,
			want:     true,
		},
		{
			name:     "wrong password",
			password: wrongPassword,
			hash:     hash,
			want:     false,
		},
		{
			name:     "empty password",
			password: "",
			hash:     hash,
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := VerifyPassword(tt.password, tt.hash)
			if got != tt.want {
				t.Errorf("VerifyPassword(%q, hash) = %v, want %v", tt.password, got, tt.want)
			}
		})
	}
}

func TestGenerateRandomString(t *testing.T) {
	tests := []struct {
		name   string
		length int
	}{
		{"length 8", 8},
		{"length 16", 16},
		{"length 32", 32},
		{"length 64", 64},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GenerateRandomString(tt.length)
			if err != nil {
				t.Fatalf("GenerateRandomString(%d) error = %v", tt.length, err)
			}

			if len(got) != tt.length {
				t.Errorf("GenerateRandomString(%d) length = %d, want %d", tt.length, len(got), tt.length)
			}

			// Check that it only contains valid characters
			const validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
			for _, c := range got {
				if !strings.ContainsRune(validChars, c) {
					t.Errorf("GenerateRandomString() contains invalid character: %c", c)
				}
			}
		})
	}
}

func TestGenerateRandomString_Uniqueness(t *testing.T) {
	// Generate multiple strings and ensure they're all different
	generated := make(map[string]bool)
	for i := 0; i < 100; i++ {
		s, err := GenerateRandomString(32)
		if err != nil {
			t.Fatalf("GenerateRandomString() error = %v", err)
		}
		if generated[s] {
			t.Errorf("GenerateRandomString() generated duplicate string")
		}
		generated[s] = true
	}
}

func TestGenerateRandomHex(t *testing.T) {
	tests := []struct {
		name       string
		byteLength int
		hexLength  int
	}{
		{"8 bytes", 8, 16},
		{"16 bytes", 16, 32},
		{"32 bytes", 32, 64},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GenerateRandomHex(tt.byteLength)
			if err != nil {
				t.Fatalf("GenerateRandomHex(%d) error = %v", tt.byteLength, err)
			}

			if len(got) != tt.hexLength {
				t.Errorf("GenerateRandomHex(%d) length = %d, want %d", tt.byteLength, len(got), tt.hexLength)
			}

			// Check that it only contains hex characters
			const hexChars = "0123456789abcdef"
			for _, c := range got {
				if !strings.ContainsRune(hexChars, c) {
					t.Errorf("GenerateRandomHex() contains non-hex character: %c", c)
				}
			}
		})
	}
}

func TestGenerateToken(t *testing.T) {
	token, err := GenerateToken()
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	// Token should be 32 hex characters (16 bytes)
	if len(token) != 32 {
		t.Errorf("GenerateToken() length = %d, want 32", len(token))
	}
}

func TestGenerateInviteCode(t *testing.T) {
	code, err := GenerateInviteCode()
	if err != nil {
		t.Fatalf("GenerateInviteCode() error = %v", err)
	}

	// Invite code should be 8 characters
	if len(code) != 8 {
		t.Errorf("GenerateInviteCode() length = %d, want 8", len(code))
	}
}

func TestGeneratePasswordResetKey(t *testing.T) {
	key, err := GeneratePasswordResetKey()
	if err != nil {
		t.Fatalf("GeneratePasswordResetKey() error = %v", err)
	}

	// Key should be 64 hex characters (32 bytes)
	if len(key) != 64 {
		t.Errorf("GeneratePasswordResetKey() length = %d, want 64", len(key))
	}
}

func TestGenerateLogoutKey(t *testing.T) {
	key := GenerateLogoutKey()

	// Key should be 32 hex characters (16 bytes)
	if len(key) != 32 {
		t.Errorf("GenerateLogoutKey() length = %d, want 32", len(key))
	}
}

func TestGenerateSessionVersion(t *testing.T) {
	version := GenerateSessionVersion()

	// Version should be 64 hex characters (32 bytes)
	if len(version) != 64 {
		t.Errorf("GenerateSessionVersion() length = %d, want 64", len(version))
	}
}

func TestHashSessionToken(t *testing.T) {
	token := "test-session-token-12345"

	hash := HashSessionToken(token)

	// SHA-256 produces 64 hex characters
	if len(hash) != 64 {
		t.Errorf("HashSessionToken() length = %d, want 64", len(hash))
	}

	// Same input should produce same hash
	hash2 := HashSessionToken(token)
	if hash != hash2 {
		t.Errorf("HashSessionToken() not deterministic")
	}

	// Different input should produce different hash
	hash3 := HashSessionToken("different-token")
	if hash == hash3 {
		t.Errorf("HashSessionToken() produced same hash for different inputs")
	}
}

func BenchmarkHashPassword(b *testing.B) {
	for i := 0; i < b.N; i++ {
		HashPassword("testpassword123")
	}
}

func BenchmarkVerifyPassword(b *testing.B) {
	hash, _ := HashPassword("testpassword123")
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		VerifyPassword("testpassword123", hash)
	}
}

func BenchmarkMD5(b *testing.B) {
	for i := 0; i < b.N; i++ {
		MD5("testpassword123")
	}
}

func BenchmarkGenerateRandomString(b *testing.B) {
	for i := 0; i < b.N; i++ {
		GenerateRandomString(32)
	}
}
