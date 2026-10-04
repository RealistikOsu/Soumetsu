// Bit values from soumetsu_api/utilities/privileges.py, which are the game server's.
export const Privilege = {
  Public: 1 << 0,
  Normal: 1 << 1,
  Donor: 1 << 2,
  AdminAccessRap: 1 << 3,
  AdminManageUsers: 1 << 4,
  AdminBanUsers: 1 << 5,
  AdminSilenceUsers: 1 << 6,
  AdminWipeUsers: 1 << 7,
  AdminManageBeatmap: 1 << 8,
  AdminManageServer: 1 << 9,
  AdminManageSetting: 1 << 10,
  AdminManageBetaKey: 1 << 11,
  AdminManageReport: 1 << 12,
  AdminManageDocs: 1 << 13,
  AdminManageBadges: 1 << 14,
  AdminViewRapLogs: 1 << 15,
  AdminManagePrivilege: 1 << 16,
  AdminSendAlerts: 1 << 17,
  AdminChatMod: 1 << 18,
  AdminKickUsers: 1 << 19,
  PendingVerification: 1 << 20,
  TournamentStaff: 1 << 21,
  Bot: 1 << 22,
  PanelViewTopScores: 1 << 23,
  AdminManageStdBeatmaps: 1 << 24,
  AdminManageTaikoBeatmaps: 1 << 25,
  AdminManageCatchBeatmaps: 1 << 26,
  AdminManageManiaBeatmaps: 1 << 27,
  PanelErrorLogs: 1 << 28,
  PanelManageClans: 1 << 29,
  PanelViewIps: 1 << 30
} as const;

export const hasPrivilege = (privileges: number, flag: number) => (privileges & flag) === flag;

export const isPublic = (privileges: number) => hasPrivilege(privileges, Privilege.Public);
export const isSupporter = (privileges: number) => hasPrivilege(privileges, Privilege.Donor);
export const isStaff = (privileges: number) => hasPrivilege(privileges, Privilege.AdminAccessRap);

// What a session that didn't pass two-factor may use, matching soumetsu-api.
export const playerPrivileges = (privileges: number) =>
  privileges &
  (Privilege.Public | Privilege.Normal | Privilege.Donor | Privilege.PendingVerification);
export const canManageUsers = (privileges: number) =>
  hasPrivilege(privileges, Privilege.AdminManageUsers);

// The panel lets staff rank if they can manage beatmaps in general or in at least one mode.
export const canRankBeatmaps = (privileges: number) =>
  hasPrivilege(privileges, Privilege.AdminAccessRap) &&
  [
    Privilege.AdminManageBeatmap,
    Privilege.AdminManageStdBeatmaps,
    Privilege.AdminManageTaikoBeatmaps,
    Privilege.AdminManageCatchBeatmaps,
    Privilege.AdminManageManiaBeatmaps
  ].some((bit) => hasPrivilege(privileges, bit));
