import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffRole, type StaffMember } from "@/lib/roles";

export type { StaffMember };

export async function listStaff(): Promise<StaffMember[]> {
  const admin = createAdminClient();
  const [{ data: usersData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, full_name, role, created_at"),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((row) => [
      row.id as string,
      {
        name: (row.full_name as string | null) ?? "",
        role: isStaffRole(row.role) ? row.role : ("coordinator" as const),
        createdAt: (row.created_at as string) ?? new Date().toISOString(),
      },
    ])
  );

  return (usersData.users ?? [])
    .map((user) => {
      const profile = profileById.get(user.id);
      const email = user.email ?? "";
      return {
        id: user.id,
        email,
        name:
          profile?.name ||
          (user.user_metadata?.full_name as string | undefined) ||
          email.split("@")[0] ||
          "Staff",
        role:
          profile?.role ??
          (isStaffRole(user.user_metadata?.role) ? user.user_metadata.role : "coordinator"),
        lastSignInAt: user.last_sign_in_at ?? null,
        createdAt: profile?.createdAt ?? user.created_at,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
