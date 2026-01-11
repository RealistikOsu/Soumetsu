package models

// Clan represents a clan in the database.
type Clan struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	Tag         string `db:"tag"`
	Description string `db:"description"`
	Icon        string `db:"icon"`
	MemberLimit int    `db:"mlimit"`
}

// ClanMember represents a clan member.
type ClanMember struct {
	UserID int `db:"user"`
	ClanID int `db:"clan"`
	Perms  int `db:"perms"`
}

// IsOwner returns true if the member is the clan owner.
func (m ClanMember) IsOwner() bool {
	return m.Perms == 8
}

// ClanInvite represents a clan invite.
type ClanInvite struct {
	ClanID int    `db:"clan"`
	Invite string `db:"invite"`
}
