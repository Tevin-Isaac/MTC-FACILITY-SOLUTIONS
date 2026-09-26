import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IntakeDraft } from "@/lib/integrations/parse-intake";
import type { Priority } from "@/types/work-order";

const SLA_HOURS: Record<Priority, { respond: number; resolve: number }> = {
  emergency_same_day: { respond: 1, resolve: 8 },
  emergency_4_hour: { respond: 1, resolve: 4 },
  priority_24_hour: { respond: 4, resolve: 24 },
  standard_48_hour: { respond: 8, resolve: 48 },
  routine_scheduled: { respond: 24, resolve: 120 },
};

export type IntakeResult = {
  workOrderId: string;
  woNumber: string;
  created: boolean;
};

async function nextWorkOrderNumber(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin.rpc("next_work_order_number");
  if (data) return String(data);
  const { data: rows } = await admin
    .from("work_orders")
    .select("wo_number")
    .order("wo_number", { ascending: false })
    .limit(20);
  const nums = (rows ?? [])
    .map((row) => parseInt(String(row.wo_number).replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  return `WO-${(nums.length ? Math.max(...nums) : 3099) + 1}`;
}

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

async function resolveSite(admin: ReturnType<typeof createAdminClient>, draft: IntakeDraft) {
  const { data: sites } = await admin.from("sites").select("id, account_id, store_code, name, address");
  const { data: accounts } = await admin.from("accounts").select("id, name");
  const list = sites ?? [];

  if (draft.storeCode) {
    const store = norm(draft.storeCode);
    const hit = list.find((site) => site.store_code && norm(String(site.store_code)) === store);
    if (hit) return hit.id as string;
  }
  if (draft.siteName) {
    const name = norm(draft.siteName);
    const hit = list.find((site) => norm(String(site.name)).includes(name) || name.includes(norm(String(site.name))));
    if (hit) return hit.id as string;
  }
  if (draft.address) {
    const address = norm(draft.address).slice(0, 16);
    const hit = list.find((site) => norm(String(site.address)).includes(address));
    if (hit) return hit.id as string;
  }
  if (draft.accountName) {
    const account = (accounts ?? []).find((row) =>
      norm(String(row.name)).includes(norm(draft.accountName!))
    );
    if (account) {
      const first = list.find((site) => site.account_id === account.id);
      if (first) return first.id as string;
    }
  }

  let accountId = (accounts ?? []).find((row) => /intake|unassigned/i.test(String(row.name)))?.id as
    | string
    | undefined;
  if (!accountId) {
    const { data: created } = await admin
      .from("accounts")
      .insert({ name: draft.accountName || "Intake", type: "commercial" })
      .select("id")
      .single();
    accountId = created?.id as string;
  }

  const { data: site, error } = await admin
    .from("sites")
    .insert({
      account_id: accountId,
      store_code: draft.storeCode,
      name: draft.siteName || draft.storeCode || "Inbound location",
      address: draft.address || "Address to confirm",
      contact_name: draft.reporterName,
      contact_phone: draft.reporterCell,
    })
    .select("id")
    .single();
  if (error || !site) throw new Error(error?.message ?? "Could not create an intake site.");
  return site.id as string;
}

export async function upsertIntakeWorkOrder(
  draft: IntakeDraft,
  actorName = "Intake"
): Promise<IntakeResult> {
  const admin = createAdminClient();
  if (draft.trackingNumber) {
    const { data: existing } = await admin
      .from("work_orders")
      .select("id, wo_number")
      .eq("external_tracking_number", draft.trackingNumber)
      .maybeSingle();
    if (existing) {
      await admin
        .from("work_orders")
        .update({
          client_extended_status: draft.clientExtendedStatus,
          nte: draft.nte ?? undefined,
          po_number: draft.poNumber ?? undefined,
          reporter_name: draft.reporterName ?? undefined,
          reporter_cell: draft.reporterCell ?? undefined,
        })
        .eq("id", existing.id);
      return { workOrderId: existing.id as string, woNumber: existing.wo_number as string, created: false };
    }
  }

  const siteId = await resolveSite(admin, draft);
  const woNumber = await nextWorkOrderNumber(admin);
  const sla = SLA_HOURS[draft.priority];
  const now = Date.now();
  const dne = draft.nte != null ? Math.round(draft.nte * 1.18) : null;
  const { data: created, error } = await admin
    .from("work_orders")
    .insert({
      wo_number: woNumber,
      site_id: siteId,
      trade: draft.trade,
      priority: draft.priority,
      status: "new",
      description: draft.description,
      po_number: draft.poNumber,
      nte: draft.nte,
      dne,
      source: draft.source,
      external_tracking_number: draft.trackingNumber,
      client_extended_status: draft.clientExtendedStatus,
      category: draft.category,
      reporter_name: draft.reporterName,
      reporter_cell: draft.reporterCell,
      sla_respond_by: new Date(now + sla.respond * 3_600_000).toISOString(),
      sla_resolve_by: new Date(now + sla.resolve * 3_600_000).toISOString(),
    })
    .select("id, wo_number")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Could not create the work order.");

  const { error: eventError } = await admin.from("work_order_events").insert({
    work_order_id: created.id,
    kind: "created",
    summary: `Work order created via ${draft.source.replace(/_/g, " ")}`,
    actor_name: actorName,
    meta: { tracking: draft.trackingNumber, subject: draft.subject },
  });
  void eventError;

  revalidatePath("/dashboard");
  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${created.id}`);
  return { workOrderId: created.id as string, woNumber: created.wo_number as string, created: true };
}
