export const ACCESS_ROLES = ["owner", "editor", "viewer"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

export const INVITE_ROLES = ["editor", "viewer"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

const RANK: Record<AccessRole, number> = { viewer: 1, editor: 2, owner: 3 };

export function isAccessRole(value: string | null | undefined): value is AccessRole {
  return value === "owner" || value === "editor" || value === "viewer";
}

export function isInviteRole(value: string | null | undefined): value is InviteRole {
  return value === "editor" || value === "viewer";
}

export function roleAtLeast(role: AccessRole, minimum: AccessRole): boolean {
  return RANK[role] >= RANK[minimum];
}

export function canEdit(role: AccessRole): boolean {
  return roleAtLeast(role, "editor");
}

export function canManage(role: AccessRole): boolean {
  return role === "owner";
}
