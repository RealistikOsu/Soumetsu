package models

import (
	"database/sql"
	"fmt"
	"time"
)

type User struct {
	ID             int            `db:"id"`
	Username       string         `db:"username"`
	UsernameSafe   string         `db:"username_safe"`
	Email          string         `db:"email"`
	Password       string         `db:"password_bcrypt"`
	Privileges     UserPrivileges `db:"privileges"`
	Public         bool           `db:"public"`
	Country        string         `db:"country"`
	RegisteredOn   time.Time      `db:"register_time"`
	LatestActivity sql.NullTime   `db:"latest_activity"`
	Coins          int            `db:"coins"`
}

type SessionUser struct {
	ID         int
	Username   string
	Privileges UserPrivileges
	Public     bool
	Clan       int
	ClanOwner  int
	Coins      int
}

func (u SessionUser) IsLoggedIn() bool {
	return u.ID != 0
}

// Banned/restricted is the public cache now, not a privilege bit.
func (u SessionUser) IsBanned() bool {
	return !u.Public
}

// HasPrivilege checks if the user has ALL of the specified privileges.
func (u SessionUser) HasPrivilege(priv UserPrivileges) bool {
	return u.Privileges&priv == priv
}

// HasAnyPrivilege checks if the user has ANY of the specified privileges.
func (u SessionUser) HasAnyPrivilege(priv UserPrivileges) bool {
	return u.Privileges&priv != 0
}

func (u SessionUser) IsActivated() bool {
	return u.HasPrivilege(UserPrivilegeActivated)
}

func (u SessionUser) IsPendingVerification() bool {
	return !u.IsActivated()
}

func (u SessionUser) IsDonor() bool {
	return u.HasPrivilege(UserPrivilegeDonor)
}

func (u SessionUser) IsAdmin() bool {
	return u.HasAnyPrivilege(AdminPrivilegeManageSettings)
}

func (u SessionUser) CanManageUsers() bool {
	return u.HasPrivilege(AdminPrivilegeManageUsers)
}

// leaderboard visibility filter -> users.public
func (u SessionUser) OnlyUserPublic() string {
	if u.CanManageUsers() {
		return "1"
	}
	return fmt.Sprintf("(users.public = 1 OR users.id = '%d')", u.ID)
}

// Clan perm bitmask, matching CLAN_PERM_* in soumetsu-api.
const (
	ClanPermMember = 1
	ClanPermOwner  = 2
)

type ClanMembership struct {
	UserID    int `db:"user_id"`
	ClanID    int `db:"clan_id"`
	ClanPerms int `db:"clan_perms"`
}

func (m ClanMembership) IsClanOwner() bool {
	return m.ClanPerms == ClanPermOwner
}

type UserStats struct {
	UserID      int     `db:"id"`
	RankedScore int64   `db:"ranked_score"`
	TotalScore  int64   `db:"total_score"`
	PlayCount   int     `db:"playcount"`
	PP          float64 `db:"pp"`
	Accuracy    float64 `db:"avg_accuracy"`
	MaxCombo    int     `db:"max_combo"`
	TotalHits   int     `db:"total_hits"`
	ReplayViews int     `db:"replays_watched"`
	Level       float64 `db:"level"`
}
