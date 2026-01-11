// Package clan provides clan management services.
package clan

import (
	"context"
	"strconv"

	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/RealistikOsu/soumetsu/internal/pkg/validation"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
	"github.com/RealistikOsu/soumetsu/internal/services"
)

// Service provides clan management operations.
type Service struct {
	clanRepo *repositories.ClanRepository
	redis    *redis.Client
}

// NewService creates a new clan service.
func NewService(clanRepo *repositories.ClanRepository, redisClient *redis.Client) *Service {
	return &Service{
		clanRepo: clanRepo,
		redis:    redisClient,
	}
}

// CreateInput represents clan creation request data.
type CreateInput struct {
	Name        string
	Tag         string
	Description string
	Icon        string
	OwnerID     int
}

// Create creates a new clan.
func (s *Service) Create(ctx context.Context, input CreateInput) (int64, error) {
	// Validate name
	if !validation.ValidateClanName(input.Name) {
		return 0, services.NewBadRequest("Invalid clan name. Use alphanumerical characters, spaces, or any of '_[]-")
	}

	// Validate tag
	if !validation.ValidateClanTag(input.Tag) {
		return 0, services.NewBadRequest("Invalid clan tag. Use 2-6 alphanumerical characters.")
	}

	// Check if name exists
	exists, err := s.clanRepo.NameExists(ctx, input.Name)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, services.NewConflict("A clan with that name already exists!")
	}

	// Check if tag exists
	exists, err = s.clanRepo.TagExists(ctx, input.Tag, 0)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, services.NewConflict("A clan with that tag already exists!")
	}

	// Check if user is already in a clan
	isMember, err := s.clanRepo.IsMember(ctx, input.OwnerID)
	if err != nil {
		return 0, err
	}
	if isMember {
		return 0, services.NewBadRequest("You are already in a clan!")
	}

	// Create clan
	clanID, err := s.clanRepo.Create(ctx, input.Name, input.Tag, input.Description, input.Icon)
	if err != nil {
		return 0, err
	}

	// Add owner as member with perms = 8
	if err := s.clanRepo.AddMember(ctx, input.OwnerID, int(clanID), 8); err != nil {
		return 0, err
	}

	// Publish clan update
	s.publishClanUpdate(ctx, input.OwnerID)

	return clanID, nil
}

// UpdateInput represents clan update request data.
type UpdateInput struct {
	ClanID      int
	Name        string
	Tag         string
	Description string
	Icon        string
	RequesterID int
}

// Update updates a clan's information.
func (s *Service) Update(ctx context.Context, input UpdateInput) error {
	// Verify requester is clan owner
	ownerClan, err := s.clanRepo.GetOwnerClan(ctx, input.RequesterID)
	if err != nil {
		return err
	}
	if ownerClan == 0 || ownerClan != input.ClanID {
		return services.ErrForbidden
	}

	// Get current clan data for defaults
	clan, err := s.clanRepo.FindByID(ctx, input.ClanID)
	if err != nil {
		return err
	}
	if clan == nil {
		return services.ErrNotFound
	}

	// Use existing values if not provided
	if input.Name == "" {
		input.Name = clan.Name
	}
	if input.Tag == "" {
		input.Tag = clan.Tag
	}
	if input.Description == "" {
		input.Description = clan.Description
	}
	if input.Icon == "" {
		input.Icon = clan.Icon
	}

	// Check if new tag conflicts
	if input.Tag != clan.Tag {
		exists, err := s.clanRepo.TagExists(ctx, input.Tag, input.ClanID)
		if err != nil {
			return err
		}
		if exists {
			return services.NewConflict("Someone already used that TAG! Please try another!")
		}
	}

	// Update clan
	if err := s.clanRepo.Update(ctx, input.ClanID, input.Name, input.Description, input.Icon, input.Tag); err != nil {
		return err
	}

	// Publish updates for all members
	if input.Tag != clan.Tag {
		userIDs, _ := s.clanRepo.GetAllMemberUserIDs(ctx, input.ClanID)
		for _, userID := range userIDs {
			s.publishClanUpdate(ctx, userID)
		}
	}

	return nil
}

// Join allows a user to join a clan via invite code.
func (s *Service) Join(ctx context.Context, userID int, inviteCode string) error {
	// Resolve invite
	clanID, err := s.clanRepo.ResolveInvite(ctx, inviteCode)
	if err != nil {
		return err
	}
	if clanID == 0 {
		return services.NewNotFound("Invalid invite code")
	}

	// Check clan exists
	exists, err := s.clanRepo.ClanExists(ctx, clanID)
	if err != nil {
		return err
	}
	if !exists {
		return services.NewNotFound("Seems like we don't found that clan.")
	}

	// Check user isn't already in a clan
	isMember, err := s.clanRepo.IsMember(ctx, userID)
	if err != nil {
		return err
	}
	if isMember {
		return services.NewBadRequest("Seems like you're already in a clan.")
	}

	// Check member limit
	count, err := s.clanRepo.GetMemberCount(ctx, clanID)
	if err != nil {
		return err
	}
	limit, err := s.clanRepo.GetMemberLimit(ctx, clanID)
	if err != nil {
		return err
	}
	if count >= limit {
		return services.NewBadRequest("Ow, I'm sorry this clan is already full ;w;")
	}

	// Add member
	if err := s.clanRepo.AddMember(ctx, userID, clanID, 1); err != nil {
		return err
	}

	// Publish clan update
	s.publishClanUpdate(ctx, userID)

	return nil
}

// Leave removes a user from their clan.
func (s *Service) Leave(ctx context.Context, userID, clanID int) error {
	// Get membership
	member, err := s.clanRepo.GetMember(ctx, userID, clanID)
	if err != nil {
		return err
	}
	if member == nil {
		return services.NewNotFound("You're not in this clan")
	}

	// If owner, disband the clan
	if member.IsOwner() {
		return s.Disband(ctx, userID, clanID)
	}

	// Remove member
	if err := s.clanRepo.RemoveMember(ctx, userID); err != nil {
		return err
	}

	// Publish clan update
	s.publishClanUpdate(ctx, userID)

	return nil
}

// Disband disbands a clan (owner only).
func (s *Service) Disband(ctx context.Context, userID, clanID int) error {
	// Verify ownership
	isOwner, err := s.clanRepo.IsOwner(ctx, userID)
	if err != nil {
		return err
	}
	if !isOwner {
		return services.ErrForbidden
	}

	// Get all member IDs for notifications
	userIDs, err := s.clanRepo.GetAllMemberUserIDs(ctx, clanID)
	if err != nil {
		return err
	}

	// Delete invites
	s.clanRepo.DeleteInvites(ctx, clanID)

	// Remove all members
	if err := s.clanRepo.RemoveAllMembers(ctx, clanID); err != nil {
		return err
	}

	// Delete clan
	if err := s.clanRepo.Delete(ctx, clanID); err != nil {
		return err
	}

	// Publish updates for all former members
	for _, uid := range userIDs {
		s.publishClanUpdate(ctx, uid)
	}

	return nil
}

// Kick removes a member from a clan (owner only).
func (s *Service) Kick(ctx context.Context, ownerID, memberID int) error {
	// Verify ownership
	isOwner, err := s.clanRepo.IsOwner(ctx, ownerID)
	if err != nil {
		return err
	}
	if !isOwner {
		return services.ErrForbidden
	}

	// Get member's clan membership
	member, err := s.clanRepo.GetMemberByClan(ctx, memberID)
	if err != nil {
		return err
	}
	if member == nil {
		return services.NewNotFound("User is not in a clan")
	}

	// Can't kick owner
	if member.IsOwner() {
		return services.NewBadRequest("Cannot kick the clan owner")
	}

	// Remove member
	if err := s.clanRepo.RemoveMember(ctx, memberID); err != nil {
		return err
	}

	// Publish clan update
	s.publishClanUpdate(ctx, memberID)

	return nil
}

// CreateInvite creates a new invite code for a clan.
func (s *Service) CreateInvite(ctx context.Context, ownerID int) (string, error) {
	// Get owner's clan
	clanID, err := s.clanRepo.GetOwnerClan(ctx, ownerID)
	if err != nil {
		return "", err
	}
	if clanID == 0 {
		return "", services.ErrForbidden
	}

	// Delete existing invites
	s.clanRepo.DeleteInvites(ctx, clanID)

	// Generate new invite code
	code, err := crypto.GenerateInviteCode()
	if err != nil {
		return "", err
	}

	// Create invite
	if err := s.clanRepo.CreateInvite(ctx, clanID, code); err != nil {
		return "", err
	}

	return code, nil
}

// GetByID gets a clan by ID.
func (s *Service) GetByID(ctx context.Context, id int) (*models.Clan, error) {
	return s.clanRepo.FindByID(ctx, id)
}

// ResolveInvite gets the clan ID from an invite code.
func (s *Service) ResolveInvite(ctx context.Context, code string) (int, error) {
	return s.clanRepo.ResolveInvite(ctx, code)
}

func (s *Service) publishClanUpdate(ctx context.Context, userID int) {
	s.redis.Publish(ctx, "rosu:clan_update", strconv.Itoa(userID))
}
