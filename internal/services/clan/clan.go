package clan

import (
	"context"
	"log"
	"strconv"

	"github.com/RealistikOsu/soumetsu/internal/adapters/redis"
	"github.com/RealistikOsu/soumetsu/internal/models"
	"github.com/RealistikOsu/soumetsu/internal/pkg/crypto"
	"github.com/RealistikOsu/soumetsu/internal/pkg/validation"
	"github.com/RealistikOsu/soumetsu/internal/repositories"
	"github.com/RealistikOsu/soumetsu/internal/services"
)

type Service struct {
	clanRepo *repositories.ClanRepository
	redis    *redis.Client
}

func NewService(clanRepo *repositories.ClanRepository, redisClient *redis.Client) *Service {
	return &Service{
		clanRepo: clanRepo,
		redis:    redisClient,
	}
}

type CreateInput struct {
	Name        string
	Tag         string
	Description string
	Icon        string
	OwnerID     int
}

func (s *Service) Create(ctx context.Context, input CreateInput) (int64, error) {
	if !validation.ValidateClanName(input.Name) {
		return 0, services.NewBadRequest("Invalid clan name. Use alphanumerical characters, spaces, or any of '_[]-")
	}

	if !validation.ValidateClanTag(input.Tag) {
		return 0, services.NewBadRequest("Invalid clan tag. Use 2-6 alphanumerical characters.")
	}

	exists, err := s.clanRepo.NameExists(ctx, input.Name)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, services.NewConflict("A clan with that name already exists!")
	}

	exists, err = s.clanRepo.TagExists(ctx, input.Tag, 0)
	if err != nil {
		return 0, err
	}
	if exists {
		return 0, services.NewConflict("A clan with that tag already exists!")
	}

	isMember, err := s.clanRepo.IsMember(ctx, input.OwnerID)
	if err != nil {
		return 0, err
	}
	if isMember {
		return 0, services.NewBadRequest("You are already in a clan!")
	}

	clanID, err := s.clanRepo.Create(ctx, input.Name, input.Tag, input.Description, input.Icon)
	if err != nil {
		return 0, err
	}

	if err := s.clanRepo.AddMember(ctx, input.OwnerID, int(clanID), 8); err != nil {
		return 0, err
	}

	s.publishClanUpdate(ctx, input.OwnerID)

	return clanID, nil
}

type UpdateInput struct {
	ClanID      int
	Name        string
	Tag         string
	Description string
	Icon        string
	RequesterID int
}

func (s *Service) Update(ctx context.Context, input UpdateInput) error {
	ownerClan, err := s.clanRepo.GetOwnerClan(ctx, input.RequesterID)
	if err != nil {
		return err
	}
	if ownerClan == 0 || ownerClan != input.ClanID {
		return services.ErrForbidden
	}

	clan, err := s.clanRepo.FindByID(ctx, input.ClanID)
	if err != nil {
		return err
	}
	if clan == nil {
		return services.ErrNotFound
	}

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

	if input.Tag != clan.Tag {
		exists, err := s.clanRepo.TagExists(ctx, input.Tag, input.ClanID)
		if err != nil {
			return err
		}
		if exists {
			return services.NewConflict("Someone already used that TAG! Please try another!")
		}
	}

	if err := s.clanRepo.Update(ctx, input.ClanID, input.Name, input.Description, input.Icon, input.Tag); err != nil {
		return err
	}

	if input.Tag != clan.Tag {
		userIDs, err := s.clanRepo.GetAllMemberUserIDs(ctx, input.ClanID)
		if err != nil {
			log.Printf("warning: failed to get clan member IDs for update notification: %v", err)
		}
		for _, userID := range userIDs {
			s.publishClanUpdate(ctx, userID)
		}
	}

	return nil
}

func (s *Service) Join(ctx context.Context, userID int, inviteCode string) (int, error) {
	clanID, err := s.clanRepo.ResolveInvite(ctx, inviteCode)
	if err != nil {
		return 0, err
	}
	if clanID == 0 {
		return 0, services.NewNotFound("Invalid invite code")
	}

	exists, err := s.clanRepo.ClanExists(ctx, clanID)
	if err != nil {
		return 0, err
	}
	if !exists {
		return 0, services.NewNotFound("Seems like we don't found that clan.")
	}

	isMember, err := s.clanRepo.IsMember(ctx, userID)
	if err != nil {
		return 0, err
	}
	if isMember {
		return 0, services.NewBadRequest("Seems like you're already in a clan.")
	}

	count, err := s.clanRepo.GetMemberCount(ctx, clanID)
	if err != nil {
		return 0, err
	}
	limit, err := s.clanRepo.GetMemberLimit(ctx, clanID)
	if err != nil {
		return 0, err
	}
	if count >= limit {
		return 0, services.NewBadRequest("Ow, I'm sorry this clan is already full ;w;")
	}

	if err := s.clanRepo.AddMember(ctx, userID, clanID, 1); err != nil {
		return 0, err
	}

	s.publishClanUpdate(ctx, userID)

	return clanID, nil
}

func (s *Service) Leave(ctx context.Context, userID, clanID int) error {
	member, err := s.clanRepo.GetMember(ctx, userID, clanID)
	if err != nil {
		return err
	}
	if member == nil {
		return services.NewNotFound("You're not in this clan")
	}

	if member.IsOwner() {
		return s.Disband(ctx, userID, clanID)
	}

	if err := s.clanRepo.RemoveMember(ctx, userID); err != nil {
		return err
	}

	s.publishClanUpdate(ctx, userID)

	return nil
}

func (s *Service) Disband(ctx context.Context, userID, clanID int) error {
	isOwner, err := s.clanRepo.IsOwner(ctx, userID)
	if err != nil {
		return err
	}
	if !isOwner {
		return services.ErrForbidden
	}

	userIDs, err := s.clanRepo.GetAllMemberUserIDs(ctx, clanID)
	if err != nil {
		return err
	}

	s.clanRepo.DeleteInvites(ctx, clanID)

	if err := s.clanRepo.RemoveAllMembers(ctx, clanID); err != nil {
		return err
	}

	if err := s.clanRepo.Delete(ctx, clanID); err != nil {
		return err
	}

	for _, uid := range userIDs {
		s.publishClanUpdate(ctx, uid)
	}

	return nil
}

func (s *Service) Kick(ctx context.Context, ownerID, memberID int) error {
	isOwner, err := s.clanRepo.IsOwner(ctx, ownerID)
	if err != nil {
		return err
	}
	if !isOwner {
		return services.ErrForbidden
	}

	member, err := s.clanRepo.GetMemberByClan(ctx, memberID)
	if err != nil {
		return err
	}
	if member == nil {
		return services.NewNotFound("User is not in a clan")
	}

	if member.IsOwner() {
		return services.NewBadRequest("Cannot kick the clan owner")
	}

	if err := s.clanRepo.RemoveMember(ctx, memberID); err != nil {
		return err
	}

	s.publishClanUpdate(ctx, memberID)

	return nil
}

func (s *Service) CreateInvite(ctx context.Context, ownerID int) (string, error) {
	clanID, err := s.clanRepo.GetOwnerClan(ctx, ownerID)
	if err != nil {
		return "", err
	}
	if clanID == 0 {
		return "", services.ErrForbidden
	}

	s.clanRepo.DeleteInvites(ctx, clanID)

	code, err := crypto.GenerateInviteCode()
	if err != nil {
		return "", err
	}

	if err := s.clanRepo.CreateInvite(ctx, clanID, code); err != nil {
		return "", err
	}

	return code, nil
}

func (s *Service) GetByID(ctx context.Context, id int) (*models.Clan, error) {
	return s.clanRepo.FindByID(ctx, id)
}

func (s *Service) ResolveInvite(ctx context.Context, code string) (int, error) {
	return s.clanRepo.ResolveInvite(ctx, code)
}

func (s *Service) publishClanUpdate(ctx context.Context, userID int) {
	s.redis.Publish(ctx, "rosu:clan_update", strconv.Itoa(userID))
}
