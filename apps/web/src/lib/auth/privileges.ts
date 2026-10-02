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
  PendingVerification: 1 << 20
} as const;

export const hasPrivilege = (privileges: number, flag: number) => (privileges & flag) === flag;

export const isPublic = (privileges: number) => hasPrivilege(privileges, Privilege.Public);
export const isSupporter = (privileges: number) => hasPrivilege(privileges, Privilege.Donor);
export const isStaff = (privileges: number) => hasPrivilege(privileges, Privilege.AdminAccessRap);
export const canManageUsers = (privileges: number) =>
  hasPrivilege(privileges, Privilege.AdminManageUsers);
