package models

type Badge struct {
	ID   int    `db:"id" json:"id"`
	Name string `db:"name" json:"name"`
	Icon string `db:"icon" json:"icon"`
}

type UserBadge struct {
	UserID  int `db:"user" json:"user_id"`
	BadgeID int `db:"badge" json:"badge_id"`
}
