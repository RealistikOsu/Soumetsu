package models

type Clan struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	Tag         string `db:"tag"`
	Description string `db:"description"`
	MemberLimit int    `db:"member_limit"`
}

type ClanMember struct {
	UserID int `db:"user_id"`
	ClanID int `db:"clan_id"`
	Perms  int `db:"clan_perms"`
}

func (m ClanMember) IsOwner() bool {
	return m.Perms == 8
}

type ClanInvite struct {
	ClanID int    `db:"clan_id"`
	Invite string `db:"invite"`
}
