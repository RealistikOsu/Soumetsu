package repositories

import (
	"context"
	"database/sql"

	"github.com/RealistikOsu/soumetsu/internal/adapters/mysql"
	"github.com/RealistikOsu/soumetsu/internal/models"
)

type ClanRepository struct {
	db *mysql.DB
}

func NewClanRepository(db *mysql.DB) *ClanRepository {
	return &ClanRepository{db: db}
}

func (r *ClanRepository) FindByID(ctx context.Context, id int) (*models.Clan, error) {
	var clan models.Clan
	err := r.db.GetContext(ctx, &clan, "SELECT id, name, tag, description, icon, mlimit FROM clans WHERE id = ?", id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &clan, nil
}

func (r *ClanRepository) Create(ctx context.Context, name, tag, description, icon string) (int64, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO clans(name, description, icon, tag)
		VALUES (?, ?, ?, ?)`, name, description, icon, tag)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (r *ClanRepository) Update(ctx context.Context, id int, name, description, icon, tag string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE clans SET name = ?, description = ?, icon = ?, tag = ?
		WHERE id = ?`, name, description, icon, tag, id)
	return err
}

func (r *ClanRepository) Delete(ctx context.Context, id int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM clans WHERE id = ?", id)
	return err
}

func (r *ClanRepository) TagExists(ctx context.Context, tag string, excludeID int) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM clans WHERE tag = ? AND id != ?", tag, excludeID).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *ClanRepository) NameExists(ctx context.Context, name string) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM clans WHERE name = ?", name).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *ClanRepository) GetMemberCount(ctx context.Context, clanID int) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM user_clans WHERE clan = ?", clanID).Scan(&count)
	return count, err
}

func (r *ClanRepository) GetMemberLimit(ctx context.Context, clanID int) (int, error) {
	var limit int
	err := r.db.QueryRowContext(ctx, "SELECT mlimit FROM clans WHERE id = ?", clanID).Scan(&limit)
	return limit, err
}

func (r *ClanRepository) AddMember(ctx context.Context, userID, clanID, perms int) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO user_clans(user, clan, perms) VALUES (?, ?, ?)", userID, clanID, perms)
	return err
}

func (r *ClanRepository) RemoveMember(ctx context.Context, userID int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM user_clans WHERE user = ?", userID)
	return err
}

func (r *ClanRepository) RemoveAllMembers(ctx context.Context, clanID int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM user_clans WHERE clan = ?", clanID)
	return err
}

func (r *ClanRepository) GetMember(ctx context.Context, userID, clanID int) (*models.ClanMember, error) {
	var member models.ClanMember
	err := r.db.GetContext(ctx, &member, "SELECT user, clan, perms FROM user_clans WHERE user = ? AND clan = ?", userID, clanID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &member, nil
}

func (r *ClanRepository) GetMemberByClan(ctx context.Context, userID int) (*models.ClanMember, error) {
	var member models.ClanMember
	err := r.db.GetContext(ctx, &member, "SELECT user, clan, perms FROM user_clans WHERE user = ?", userID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &member, nil
}

func (r *ClanRepository) GetOwnerClan(ctx context.Context, userID int) (int, error) {
	var clanID int
	err := r.db.QueryRowContext(ctx, "SELECT clan FROM user_clans WHERE user = ? AND perms = 8 LIMIT 1", userID).Scan(&clanID)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return clanID, err
}

func (r *ClanRepository) IsOwner(ctx context.Context, userID int) (bool, error) {
	var perms int
	err := r.db.QueryRowContext(ctx, "SELECT perms FROM user_clans WHERE user = ? AND perms = 8 LIMIT 1", userID).Scan(&perms)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *ClanRepository) IsMember(ctx context.Context, userID int) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM user_clans WHERE user = ?", userID).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *ClanRepository) GetAllMemberUserIDs(ctx context.Context, clanID int) ([]int, error) {
	rows, err := r.db.QueryContext(ctx, "SELECT user FROM user_clans WHERE clan = ?", clanID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			continue
		}
		userIDs = append(userIDs, userID)
	}
	return userIDs, rows.Err()
}

func (r *ClanRepository) CreateInvite(ctx context.Context, clanID int, inviteCode string) error {
	_, err := r.db.ExecContext(ctx, "INSERT INTO clans_invites(clan, invite) VALUES (?, ?)", clanID, inviteCode)
	return err
}

func (r *ClanRepository) DeleteInvites(ctx context.Context, clanID int) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM clans_invites WHERE clan = ?", clanID)
	return err
}

func (r *ClanRepository) ResolveInvite(ctx context.Context, inviteCode string) (int, error) {
	var clanID int
	err := r.db.QueryRowContext(ctx, "SELECT clan FROM clans_invites WHERE invite = ?", inviteCode).Scan(&clanID)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return clanID, err
}

func (r *ClanRepository) ClanExists(ctx context.Context, clanID int) (bool, error) {
	var exists int
	err := r.db.QueryRowContext(ctx, "SELECT 1 FROM clans WHERE id = ?", clanID).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}
