import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseIsConfigured } from "@/lib/supabase/env";
import {
  isAdminRole,
  isStaffRole,
  type PublicSession,
  type StaffRole,
} from "@/lib/roles";

export type { PublicSession, StaffRole };

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function displayName(
  fullName: string | null | undefined,
  metadataName: string | undefined,
  email: string
): string {
  return fullName?.trim() || metadataName?.trim() || email.split("@")[0] || "Staff";
}

function resolveRole(
  stored: unknown,
  metadata: unknown,
  email: string,
  soleUser: boolean
): StaffRole {
  if (adminEmails().includes(email.toLowerCase())) {
    return isStaffRole(stored) && isAdminRole(stored) ? stored : "owner";
  }
  if (isStaffRole(stored) && isAdminRole(stored)) return stored;
  if (isStaffRole(stored) && !soleUser) return stored;
  if (soleUser) return "owner";
  if (isStaffRole(metadata)) return metadata;
  return "coordinator";
}

export async function getSession(): Promise<PublicSession | null> {
  if (!supabaseIsConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";
  const name = displayName(
    profile?.full_name as string | null,
    user.user_metadata?.full_name as string | undefined,
    email
  );

  let soleUser = false;
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true });
    soleUser = (count ?? 0) <= 1;
  } catch {
    soleUser = adminEmails().includes(email.toLowerCase());
  }

  let role = resolveRole(profile?.role, user.user_metadata?.role, email, soleUser);

  if (!profile || profile.role !== role) {
    try {
      const admin = createAdminClient();
      await admin.from("profiles").upsert({
        id: user.id,
        full_name: name,
        role,
      });
    } catch {
      // Local / missing service role — session still works from metadata.
    }
  }

  return {
    userId: user.id,
    email,
    name,
    role,
    isAdmin: isAdminRole(role),
  };
}

export async function requireSession(): Promise<PublicSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<PublicSession> {
  const session = await requireSession();
  if (!session.isAdmin) redirect("/dashboard");
  return session;
}

export async function assertAdmin(): Promise<PublicSession> {
  const session = await getSession();
  if (!session) throw new Error("You need to be signed in to do that.");
  if (!session.isAdmin) throw new Error("Only an owner or admin can do that.");
  return session;
}
