import { m } from '$lib/paraglide/messages';
import { ApiError } from './errors';

type Message = () => string;

const messages: Record<string, Message> = {
  'auth.unauthenticated': m.common_error_unauthenticated,
  'auth.user_not_found': m.common_error_account_not_found,
  'auth.invalid_credentials': m.common_error_wrong_password,
  'auth.account_restricted': m.common_error_account_restricted,
  'auth.account_pending': m.common_error_account_pending,
  'auth.password_version_old': m.common_error_password_version_old,
  'auth.username_taken': m.common_error_username_taken,
  'auth.email_taken': m.common_error_email_taken,
  'auth.username_reserved': m.common_error_username_reserved,
  'auth.invalid_captcha': m.common_error_invalid_captcha,
  'auth.validation_error': m.common_error_validation,

  'users.user_not_found': m.common_error_user_not_found,
  'users.user_restricted': m.common_error_user_not_found,
  'users.forbidden': m.common_error_insufficient_privileges,
  'users.username_taken': m.common_error_username_taken,
  'users.username_reserved': m.common_error_username_reserved,
  'users.no_discord_linked': m.common_error_no_discord_linked,
  'users.discord_already_linked': m.common_error_discord_already_linked,
  'users.discord_oauth_failed': m.common_error_discord_oauth_failed,
  'users.invalid_password': m.common_error_wrong_password,
  'users.weak_password': m.common_error_weak_password,
  'users.upload_failed': m.common_error_upload_failed,
  'users.invalid_file_format': m.common_error_invalid_file_format,
  'users.file_too_large': m.common_error_file_too_large,

  'clans.clan_not_found': m.common_error_clan_not_found,
  'clans.not_owner': m.common_error_not_clan_owner,
  'clans.not_member': m.common_error_not_clan_member,
  'clans.already_in_clan': m.common_error_already_in_clan,
  'clans.clan_full': m.common_error_clan_full,
  'clans.invalid_invite': m.common_error_invalid_invite,
  'clans.name_taken': m.common_error_clan_name_taken,
  'clans.tag_taken': m.common_error_clan_tag_taken,
  'clans.cannot_kick_owner': m.common_error_cannot_kick_owner,
  'clans.user_not_in_clan': m.common_error_user_not_in_clan,
  'clans.file_too_large': m.common_error_file_too_large,
  'clans.invalid_file_format': m.common_error_invalid_file_format,
  'clans.upload_failed': m.common_error_upload_failed,
  'clans.icon_not_found': m.common_error_clan_icon_not_found,

  'comments.comment_not_found': m.common_error_comment_not_found,
  'comments.user_not_found': m.common_error_user_not_found,
  'comments.forbidden': m.common_error_comment_forbidden,
  'comments.comments_disabled': m.common_error_comments_disabled,

  'friends.already_friends': m.common_error_already_friends,
  'friends.not_friends': m.common_error_not_friends,
  'friends.cannot_add_self': m.common_error_cannot_add_self,
  'friends.user_not_found': m.common_error_user_not_found,
  'friends.user_restricted': m.common_error_user_not_found,

  'scores.score_not_found': m.common_error_score_not_found,
  'scores.already_pinned': m.common_error_already_pinned,
  'scores.not_pinned': m.common_error_not_pinned,
  'scores.not_your_score': m.common_error_not_your_score,

  'beatmaps.beatmap_not_found': m.common_error_beatmap_not_found,
  'beatmaps.already_requested': m.common_error_already_requested,
  'beatmaps.daily_limit_reached': m.common_error_daily_limit_reached,
  'beatmaps.invalid_url': m.common_error_invalid_beatmap_url,
  'beatmaps.already_ranked': m.common_error_already_ranked,
  'beatmaps.delete_forbidden': m.common_error_beatmap_delete_forbidden,
  'beatmaps.delete_ranked': m.common_error_beatmap_delete_ranked,

  'site.forbidden': m.common_error_forbidden,
  'site.supporter_only': m.common_error_supporter_only,
  'site.invalid_colour': m.common_error_invalid_colour,
  'site.invalid_request': m.common_error_invalid_request,
  'site.registrations_closed': m.common_error_registrations_closed,
  'site.reset_key_not_found': m.common_error_reset_key_not_found,
  'site.not_linked': m.common_error_not_linked,
  'site.already_linked': m.common_error_already_linked,
  'site.not_configured': m.common_error_not_configured,
  'site.oauth_state_invalid': m.common_error_oauth_state_invalid,
  'site.oauth_rejected': m.common_error_oauth_rejected,
  'site.oauth_profile_failed': m.common_error_oauth_profile_failed,
  'site.payments_unavailable': m.common_error_payments_unavailable,
  'site.doc_not_found': m.common_error_page_not_found,
  'site.mirror_unreachable': m.common_error_mirror_unreachable,

  network_error: m.common_error_network
};

const byStatus: Record<number, Message> = {
  401: m.common_error_session_expired,
  403: m.common_error_forbidden,
  404: m.common_error_not_found,
  413: m.common_error_file_too_large,
  429: m.common_error_rate_limited
};

export function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return m.common_error_generic();
  // Staff-facing routes answer with a sentence rather than an error name.
  if (error.code.includes(' ')) return error.code;
  const message = messages[error.code] ?? byStatus[error.status] ?? m.common_error_generic;
  return message();
}
