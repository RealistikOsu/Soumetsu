export const Privilege = {
  Public: 1 << 0,
  Normal: 1 << 1,
  Donor: 1 << 2,
  AdminAccessRap: 1 << 3,
  AdminManageUsers: 1 << 4,
  PendingVerification: 1 << 20
} as const;

const has = (privileges: number, flag: number) => (privileges & flag) === flag;

export const isPublic = (privileges: number) => has(privileges, Privilege.Public);
export const isSupporter = (privileges: number) => has(privileges, Privilege.Donor);
export const isStaff = (privileges: number) => has(privileges, Privilege.AdminAccessRap);
export const canManageUsers = (privileges: number) => has(privileges, Privilege.AdminManageUsers);
