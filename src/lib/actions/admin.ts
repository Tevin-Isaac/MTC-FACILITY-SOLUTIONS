"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { listStaff } from "@/lib/data/staff";
import { isAdminRole, isStaffRole, STAFF_ROLES } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/work-orders";

const ROLE = z.enum(STAFF_ROLES);

function tempPassword(): string {
  return `Mtc-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}!`;
}

export async function inviteStaff(formData: FormData): Promise<ActionResult> {
  try {
    await assertAdmin();
    const parsed = z
      .object({
        email: z.string().email("Enter a real email."),
        name: z.string().trim().min(2, "Enter their name.").max(80),
        role: ROLE,
      })
      .safeParse({
        email: String(formData.get("email") ?? "").trim(),
        name: String(formData.get("name") ?? "").trim(),
        role: String(formData.get("role") ?? "coordinator"),
      });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the staff details." };
    }

    const admin = createAdminClient();
    const password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.name, role: parsed.data.role },
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message ?? "Could not create that account." };
    }

    await admin.from("profiles").upsert({
      id: data.user.id,
      full_name: parsed.data.name,
      role: parsed.data.role,
    });

    revalidatePath("/admin");
    return {
      ok: true,
      message: `${parsed.data.name} can sign in with ${parsed.data.email}. Temporary password: ${password}`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not invite that person." };
  }
}

export async function setStaffRole(formData: FormData): Promise<ActionResult> {
  try {
    const session = await assertAdmin();
    const userId = String(formData.get("userId") ?? "");
    const roleRaw = String(formData.get("role") ?? "");
    if (!userId || !isStaffRole(roleRaw)) {
      return { ok: false, error: "Pick a staff member and a role." };
    }

    if (userId === session.userId && !isAdminRole(roleRaw)) {
      return { ok: false, error: "You cannot remove your own admin access." };
    }

    const staff = await listStaff();
    const owners = staff.filter((member) => member.role === "owner");
    const target = staff.find((member) => member.id === userId);
    if (target?.role === "owner" && roleRaw !== "owner" && owners.length <= 1) {
      return { ok: false, error: "Keep at least one owner on the account." };
    }

    const admin = createAdminClient();
    const { error } = await admin.from("profiles").upsert({
      id: userId,
      role: roleRaw,
      full_name: target?.name ?? null,
    });
    if (error) return { ok: false, error: error.message };

    await admin.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: target?.name, role: roleRaw },
    });

    revalidatePath("/admin");
    return { ok: true, message: `${target?.name ?? "Staff"} is now ${roleRaw.replace(/_/g, " ")}.` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not change that role." };
  }
}
