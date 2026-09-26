export const STAFF_ROLES = [
  "owner",
  "admin",
  "account_manager",
  "vendor_relations",
  "coordinator",
  "after_hours",
  "vendor",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Admin",
  account_manager: "Account manager",
  vendor_relations: "Vendor relations",
  coordinator: "Coordinator",
  after_hours: "After hours",
  vendor: "Vendor",
};

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

export function isAdminRole(role: StaffRole): boolean {
  return role === "owner" || role === "admin";
}

export type PublicSession = {
  userId: string;
  email: string;
  name: string;
  role: StaffRole;
  isAdmin: boolean;
};

export type StaffMember = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  lastSignInAt: string | null;
  createdAt: string;
};

export function initialsFor(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (email.slice(0, 2) || "MT").toUpperCase();
}
