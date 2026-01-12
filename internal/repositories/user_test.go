package repositories

import (
	"testing"

	"github.com/RealistikOsu/soumetsu/internal/testutil"
)

func TestUserRepository_FindByID(t *testing.T) {
	testutil.SkipIfNoDatabase(t)

	db := testutil.TestDB(t)
	ctx := testutil.TestContext(t)
	repo := NewUserRepository(db)

	// Test with non-existent user
	user, err := repo.FindByID(ctx, 999999999)
	if err != nil {
		t.Fatalf("FindByID() error = %v", err)
	}
	if user != nil {
		t.Errorf("FindByID() returned user for non-existent ID")
	}
}

func TestUserRepository_FindByUsername(t *testing.T) {
	testutil.SkipIfNoDatabase(t)

	db := testutil.TestDB(t)
	ctx := testutil.TestContext(t)
	repo := NewUserRepository(db)

	// Test with non-existent username
	user, err := repo.FindByUsername(ctx, "nonexistent_user_12345")
	if err != nil {
		t.Fatalf("FindByUsername() error = %v", err)
	}
	if user != nil {
		t.Errorf("FindByUsername() returned user for non-existent username")
	}
}

func TestUserRepository_FindByEmail(t *testing.T) {
	testutil.SkipIfNoDatabase(t)

	db := testutil.TestDB(t)
	ctx := testutil.TestContext(t)
	repo := NewUserRepository(db)

	// Test with non-existent email
	user, err := repo.FindByEmail(ctx, "nonexistent@example.com")
	if err != nil {
		t.Fatalf("FindByEmail() error = %v", err)
	}
	if user != nil {
		t.Errorf("FindByEmail() returned user for non-existent email")
	}
}

func TestUserRepository_FindByUsernameOrEmail(t *testing.T) {
	testutil.SkipIfNoDatabase(t)

	db := testutil.TestDB(t)
	ctx := testutil.TestContext(t)
	repo := NewUserRepository(db)

	tests := []struct {
		name       string
		identifier string
	}{
		{"username", "nonexistent_user"},
		{"email", "nonexistent@example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user, err := repo.FindByUsernameOrEmail(ctx, tt.identifier)
			if err != nil {
				t.Fatalf("FindByUsernameOrEmail(%q) error = %v", tt.identifier, err)
			}
			if user != nil {
				t.Errorf("FindByUsernameOrEmail(%q) returned user for non-existent identifier", tt.identifier)
			}
		})
	}
}

func TestUserRepository_FindForLogin(t *testing.T) {
	testutil.SkipIfNoDatabase(t)

	db := testutil.TestDB(t)
	ctx := testutil.TestContext(t)
	repo := NewUserRepository(db)

	// Test with non-existent user
	user, err := repo.FindForLogin(ctx, "nonexistent_user")
	if err != nil {
		t.Fatalf("FindForLogin() error = %v", err)
	}
	if user != nil {
		t.Errorf("FindForLogin() returned user for non-existent username")
	}
}

func TestSafeUsername(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"lowercase", "TestUser", "testuser"},
		{"spaces to underscores", "Test User", "test_user"},
		{"already safe", "testuser", "testuser"},
		{"mixed", "Test User 123", "test_user_123"},
		{"trim spaces", "  TestUser  ", "testuser"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := SafeUsername(tt.input)
			if got != tt.expected {
				t.Errorf("SafeUsername(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

// Integration test that requires a real user in the database
func TestUserRepository_FindExistingUser(t *testing.T) {
	testutil.SkipIfNoDatabase(t)

	db := testutil.TestDB(t)
	ctx := testutil.TestContext(t)
	repo := NewUserRepository(db)

	// Try to find user with ID 1 (often exists as admin)
	user, err := repo.FindByID(ctx, 1)
	if err != nil {
		t.Fatalf("FindByID(1) error = %v", err)
	}

	if user != nil {
		t.Logf("Found user: ID=%d, Username=%s", user.ID, user.Username)

		// Verify we can also find by username
		userByName, err := repo.FindByUsername(ctx, user.Username)
		if err != nil {
			t.Fatalf("FindByUsername(%q) error = %v", user.Username, err)
		}
		if userByName == nil {
			t.Errorf("FindByUsername(%q) returned nil", user.Username)
		} else if userByName.ID != user.ID {
			t.Errorf("FindByUsername returned different user: got ID %d, want %d", userByName.ID, user.ID)
		}
	} else {
		t.Log("No user with ID=1 found (this is OK for empty test databases)")
	}
}

// Benchmarks are skipped as they require special setup
// They can be run manually with database connection
