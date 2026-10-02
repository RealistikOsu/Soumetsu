import { ApiError } from './errors';

const fallback = 'Something went wrong on our end. Try again in a bit.';

const messages: Record<string, string> = {
  'auth.unauthenticated': 'You need to log in first.',
  'auth.user_not_found': 'No account with that username or email.',
  'auth.invalid_credentials': 'Wrong password.',
  'auth.account_restricted':
    'You are not allowed to log in. This means your account is either banned or locked.',
  'auth.account_pending': 'You will need to verify your account first.',
  'auth.password_version_old':
    "Your password is so old that we don't even know how to deal with it any more. Could you please change it?",
  'auth.username_taken': 'A user with that username already exists!',
  'auth.email_taken': 'A user with that email address already exists!',
  'auth.username_reserved': 'This username has been reserved by another user.',
  'auth.invalid_captcha': 'Captcha check failed, please try again.',
  'auth.validation_error': 'Some of what you entered is not allowed. Check it and try again.',

  'users.user_not_found': 'That user could not be found.',
  'users.user_restricted': 'That user could not be found.',
  'users.forbidden': 'You do not have sufficient privileges to do that.',
  'users.username_taken': 'A user with that username already exists!',
  'users.username_reserved': 'This username has been reserved by another user.',
  'users.no_discord_linked': 'You have no Discord account linked.',
  'users.discord_already_linked': 'That Discord account is already linked to another user.',
  'users.discord_oauth_failed': 'Discord linking failed. Please try again.',
  'users.invalid_password': 'Wrong password.',
  'users.weak_password': 'Your password is too weak.',
  'users.upload_failed': 'We were not able to save that file.',
  'users.invalid_file_format': 'The file you uploaded is not a valid image.',
  'users.file_too_large': 'That file is too large.',

  'clans.clan_not_found': 'That clan could not be found.',
  'clans.not_owner': 'Only the clan owner can do that.',
  'clans.not_member': "You're not in that clan.",
  'clans.already_in_clan': "Seems like you're already in a clan.",
  'clans.clan_full': "Ow, I'm sorry, this clan is already full ;w;",
  'clans.invalid_invite': 'That invite is not valid.',
  'clans.name_taken': 'Someone already took that clan name... oof.',
  'clans.tag_taken': 'Someone already took that tag!',
  'clans.cannot_kick_owner': "You can't kick the clan owner.",
  'clans.user_not_in_clan': "That user isn't in your clan.",
  'clans.file_too_large': 'That file is too large.',
  'clans.invalid_file_format': 'The file you uploaded is not a valid image.',
  'clans.upload_failed': 'We were not able to save that file.',
  'clans.icon_not_found': 'This clan has no icon.',

  'comments.comment_not_found': 'That comment could not be found.',
  'comments.user_not_found': 'That user could not be found.',
  'comments.forbidden': 'You do not have permission to do that.',
  'comments.comments_disabled': 'This user has turned comments off.',

  'friends.already_friends': "You've already added this user.",
  'friends.not_friends': "You haven't added this user.",
  'friends.cannot_add_self': "You can't add yourself.",
  'friends.user_not_found': 'That user could not be found.',
  'friends.user_restricted': 'That user could not be found.',

  'scores.score_not_found': 'That score could not be found.',
  'scores.already_pinned': 'That score is already pinned.',
  'scores.not_pinned': "That score isn't pinned.",
  'scores.not_your_score': 'You can only pin your own scores.',

  'beatmaps.beatmap_not_found': 'That beatmap could not be found.',
  'beatmaps.already_requested': 'That beatmap has already been requested.',
  'beatmaps.daily_limit_reached': "You've used all of your requests for today.",
  'beatmaps.invalid_url': "That doesn't look like a beatmap link.",
  'beatmaps.already_ranked': 'That beatmap is already ranked.',

  'site.forbidden': "You don't have permission to do that.",
  'site.supporter_only': 'This feature is restricted to RealistikOsu supporters only.',
  'site.invalid_colour': 'Colour is invalid',
  'site.invalid_request': 'Something about that request was not right. Check it and try again.',
  'site.registrations_closed':
    "Sorry, it's not possible to register at the moment. Please try again later.",
  'site.reset_key_not_found': 'That key could not be found. Perhaps it expired?',
  'site.not_linked': 'You have no account linked.',
  'site.already_linked': 'That account is already linked to another player.',
  'site.not_configured': 'This is not set up on this server.',
  'site.oauth_state_invalid': 'The authorisation could not be verified. Please try again.',
  'site.oauth_rejected': 'The authorisation was rejected. Please try again.',
  'site.oauth_profile_failed': 'Could not read your profile. Please try again.',
  'site.payments_unavailable': 'Payments are currently unavailable. Please try again later.',
  'site.doc_not_found': 'That page could not be found.',
  'site.mirror_unreachable': "Couldn't reach the beatmap mirror. Try again in a bit.",

  network_error: "Couldn't reach the server. Check your connection and try again."
};

const byStatus: Record<number, string> = {
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to do that.",
  404: 'That could not be found.',
  413: 'That file is too large.',
  429: "You're doing that too often. Try again in a bit."
};

export function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return fallback;
  // Staff-facing routes answer with a sentence rather than an error name.
  if (error.code.includes(' ')) return error.code;
  return messages[error.code] ?? byStatus[error.status] ?? fallback;
}
