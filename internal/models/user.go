package models

import (
	"fmt"

	"github.com/RealistikOsu/RealistikAPI/common"
)

type User struct {
	ID              int                    `db:"id"`
	Username        string                 `db:"username"`
	UsernameSafe    string                 `db:"username_safe"`
	Email           string                 `db:"email"`
	Password        string                 `db:"password_md5"`
	PasswordVersion int                    `db:"password_version"`
	Privileges      common.UserPrivileges  `db:"privileges"`
	Flags           uint64                 `db:"flags"`
	Country         string                 `db:"country"`
	RegisteredOn    int64                  `db:"register_datetime"`
	LatestActivity  int64                  `db:"latest_activity"`
	Coins           int                    `db:"coins"`
}

type SessionUser struct {
	ID         int
	Username   string
	Privileges common.UserPrivileges
	Flags      uint64
	Clan       int
	ClanOwner  int
	Coins      int
}

func (u SessionUser) IsLoggedIn() bool {
	return u.ID != 0
}

func (u SessionUser) IsBanned() bool {
	return u.Privileges&1 == 0
}

func (u SessionUser) HasPrivilege(priv common.UserPrivileges) bool {
	return u.Privileges&priv == priv
}

func (u SessionUser) CanManageUsers() bool {
	return u.HasPrivilege(common.AdminPrivilegeManageUsers)
}

func (u SessionUser) OnlyUserPublic() string {
	if u.CanManageUsers() {
		return "1"
	}
	return fmt.Sprintf("(users.privileges & 1 = 1 OR users.id = '%d')", u.ID)
}

type ClanMembership struct {
	UserID    int `db:"user"`
	ClanID    int `db:"clan"`
	ClanPerms int `db:"perms"`
}

func (m ClanMembership) IsClanOwner() bool {
	return m.ClanPerms == 8
}

type UserStats struct {
	UserID         int     `db:"id"`
	RankedScore    int64   `db:"ranked_score"`
	TotalScore     int64   `db:"total_score"`
	PlayCount      int     `db:"playcount"`
	PP             float64 `db:"pp"`
	Accuracy       float64 `db:"avg_accuracy"`
	MaxCombo       int     `db:"max_combo"`
	TotalHits      int     `db:"total_hits"`
	ReplayViews    int     `db:"replays_watched"`
	Level          float64 `db:"level"`
}
