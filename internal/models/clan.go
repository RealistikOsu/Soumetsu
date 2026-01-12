package models

type Clan struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	Tag         string `db:"tag"`
	Description string `db:"description"`
	Icon        string `db:"icon"`
	MemberLimit int    `db:"mlimit"`
}

type ClanMember struct {
	UserID int `db:"user"`
	ClanID int `db:"clan"`
	Perms  int `db:"perms"`
}

func (m ClanMember) IsOwner() bool {
	return m.Perms == 8
}

type ClanInvite struct {
	ClanID int    `db:"clan"`
	Invite string `db:"invite"`
}
