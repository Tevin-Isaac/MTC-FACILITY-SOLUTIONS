"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { makeShareToken, readShareToken } from "@/lib/share-token";
import { isId } from "@/lib/ids";
import type { ActionResult } from "@/lib/actions/work-orders";
import type { WorkOrderStatus } from "@/types/work-order";

const CAN_SEND_ESTIMATE: WorkOrderStatus[] = [
  "new",
  "assigned",
  "schedule_confirmed",
  "tech_onsite",
  "pending_quote",
  "quote_with_client",
  "quote_declined",
];

async function requireActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    actor: {
      id: user.id,
      name:
        (profile?.full_name as string | null) ??
        (user.user_metadata?.full_name as string | undefined) ??
        user.email ??
        "Unknown user",
    },
  };
}

async function run(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong.",
    };
  }
}

function tableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    text.includes("does not exist") ||
    text.includes("could not find the table") ||
    text.includes("schema cache") ||
    error.code === "PGRST205" ||
    error.code === "42P01"
  );
}

async function logEvent(
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  workOrderId: string,
  kind: string,
  summary: string,
  extra: { actorId?: string; actorName?: string; meta?: Record<string, unknown> } = {}
) {
  const { error } = await client.from("work_order_events").insert({
    work_order_id: workOrderId,
    kind,
    summary,
    actor_id: extra.actorId ?? null,
    actor_name: extra.actorName ?? null,
    meta: extra.meta ?? {},
  });
  if (error && !tableMissing(error)) {
    throw new Error(`Could not record activity: ${error.message}`);
  }
}

function money(value: FormDataEntryValue | null): number {
  const n = Number(typeof value === "string" ? value : "");
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function hourLine(
  side: "repair" | "replace",
  kind: "incurred" | "proposed",
  description: string,
  hours: number,
  rate: number
) {
  if (hours <= 0 && rate <= 0) return null;
  return {
    side,
    description,
    kind,
    labor_hours: hours,
    labor_rate: rate,
    materials_cost: null,
    markup_percent: null,
  };
}

function linesFromForm(formData: FormData) {
  const optionType: "single" | "repair_vs_replace" =
    formData.get("optionType") === "repair_vs_replace" ? "repair_vs_replace" : "single";
  const tripRate = money(formData.get("tripRate")) || 115;
  const laborRate = money(formData.get("laborRate")) || 95;
  const incurredTrip = money(formData.get("incurredTripHours"));
  const incurredLabor = money(formData.get("incurredLaborHours"));
  const proposedTrip = money(formData.get("proposedTripHours"));
  const proposedLabor = money(formData.get("proposedLaborHours"));
  const replaceHours = money(formData.get("replaceLaborHours"));
  const replaceRate = money(formData.get("replaceLaborRate")) || laborRate;

  const names = formData.getAll("materialName").map((value) => String(value).trim());
  const costs = formData.getAll("materialCost").map((value) => money(value));
  const sides = formData.getAll("materialSide").map((value) =>
    value === "replace" ? ("replace" as const) : ("repair" as const)
  );

  const rows = [
    hourLine("repair", "incurred", "Incurred Trip", incurredTrip, tripRate),
    hourLine("repair", "incurred", "Incurred Labor", incurredLabor, laborRate),
    hourLine("repair", "proposed", "Proposed Trip", proposedTrip, tripRate),
    hourLine("repair", "proposed", "Proposed Labor", proposedLabor, laborRate),
    optionType === "repair_vs_replace"
      ? hourLine("replace", "proposed", "Proposed Labor", replaceHours, replaceRate)
      : null,
    ...names.map((name, index) => {
      const cost = costs[index] ?? 0;
      if (!name || cost <= 0) return null;
      return {
        side: optionType === "repair_vs_replace" ? sides[index] ?? "repair" : ("repair" as const),
        description: name,
        kind: "proposed" as const,
        labor_hours: null,
        labor_rate: null,
        materials_cost: cost,
        markup_percent: 0,
      };
    }),
    {
      side: "repair" as const,
      description: `§:notes|${String(formData.get("incurredNotes") ?? "").trim()}`,
      kind: "incurred" as const,
      labor_hours: null,
      labor_rate: null,
      materials_cost: null,
      markup_percent: null,
    },
    {
      side: "repair" as const,
      description: `§:resolution|${String(formData.get("resolution") ?? "").trim()}`,
      kind: "proposed" as const,
      labor_hours: null,
      labor_rate: null,
      materials_cost: null,
      markup_percent: null,
    },
    {
      side: "repair" as const,
      description: `§:exclusions|${String(formData.get("exclusions") ?? "").trim()}`,
      kind: "proposed" as const,
      labor_hours: null,
      labor_rate: null,
      materials_cost: null,
      markup_percent: null,
    },
    {
      side: "repair" as const,
      description: `§:lead|${String(formData.get("leadTime") ?? "").trim()}`,
      kind: "proposed" as const,
      labor_hours: null,
      labor_rate: null,
      materials_cost: null,
      markup_percent: null,
    },
    {
      side: "repair" as const,
      description: `§:review|${[formData.get("review1"), formData.get("review2"), formData.get("review3")]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
        .join("|")}`,
      kind: "proposed" as const,
      labor_hours: null,
      labor_rate: null,
      materials_cost: null,
      markup_percent: null,
    },
  ].filter((row) => row != null);

  return { optionType, rows };
}

function validateMtcQuote(formData: FormData, rows: ReturnType<typeof linesFromForm>["rows"]): string | null {
  const notes = String(formData.get("incurredNotes") ?? "").trim();
  const resolution = String(formData.get("resolution") ?? "").trim();
  const exclusions = String(formData.get("exclusions") ?? "").trim();
  const leadTime = String(formData.get("leadTime") ?? "").trim();
  if (notes.length < 12) return "Write what already happened on site — incurred work.";
  if (money(formData.get("incurredTripHours")) <= 0) return "Record incurred trip hours.";
  if (money(formData.get("incurredLaborHours")) <= 0) return "Record incurred labor hours.";
  if (resolution.length < 12) return "Write the proposed resolution in numbered steps.";
  if (money(formData.get("proposedTripHours")) <= 0) return "Record proposed trip hours.";
  if (money(formData.get("proposedLaborHours")) <= 0) return "Record proposed labor hours.";
  if (exclusions.length < 8) return "Exclusions are required.";
  if (leadTime.length < 8) return "Lead time is required — when can we return if approved?";
  const names = formData.getAll("materialName").map((value) => String(value).trim().toLowerCase());
  if (names.some((name) => /^(materials?|electrical materials?|lump\s*sum|misc)$/.test(name))) {
    return "Break materials down line by line. Do not bulk them together.";
  }
  const total = rows.reduce((sum, row) => {
    if (row.description.startsWith("§:")) return sum;
    return sum + Math.round((row.labor_hours ?? 0) * (row.labor_rate ?? 0) + (row.materials_cost ?? 0));
  }, 0);
  const reviews = [formData.get("review1"), formData.get("review2"), formData.get("review3")]
    .map((value) => String(value ?? "").trim())
    .filter((name) => name.length >= 2);
  if (total > 50_000 && reviews.length < 3) return "Over $50,000 requires three opinions.";
  if (total > 20_000 && reviews.length < 2) return "Over $20,000 requires a second or third opinion.";
  if (total > 10_000 && reviews.length < 1) return "Over $10,000 requires a second opinion.";
  return null;
}

async function upsertQuote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workOrderId: string,
  optionType: "single" | "repair_vs_replace",
  status: "draft" | "submitted",
  rows: ReturnType<typeof linesFromForm>["rows"]
) {
  const { data: existing } = await supabase
    .from("quotes")
    .select("id")
    .eq("work_order_id", workOrderId)
    .limit(1)
    .maybeSingle();

  let quoteId = existing?.id as string | undefined;
  if (quoteId) {
    const { error } = await supabase
      .from("quotes")
      .update({ option_type: optionType, status })
      .eq("id", quoteId);
    if (error) throw new Error(`Could not save the estimate: ${error.message}`);
    await supabase.from("quote_line_items").delete().eq("quote_id", quoteId);
  } else {
    const { data: created, error } = await supabase
      .from("quotes")
      .insert({ work_order_id: workOrderId, option_type: optionType, status })
      .select("id")
      .single();
    if (error) throw new Error(`Could not create the estimate: ${error.message}`);
    quoteId = created.id as string;
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("quote_line_items").insert(
      rows.map((row) => ({ quote_id: quoteId, ...row }))
    );
    if (error) throw new Error(`Could not save estimate lines: ${error.message}`);
  }
  return quoteId;
}

export async function saveEstimate(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    if (!isId(workOrderId)) {
      return { ok: false, error: "Missing work order." };
    }
    const { optionType, rows } = linesFromForm(formData);
    if (rows.length === 0) return { ok: false, error: "Add incurred and proposed lines." };
    await upsertQuote(supabase, workOrderId, optionType, "draft", rows);
    await logEvent(supabase, workOrderId, "quote_submitted", "Estimate draft saved", {
      actorId: actor.id,
      actorName: actor.name,
      meta: { optionType },
    });
    revalidatePath(`/work-orders/${workOrderId}`);
    return { ok: true, message: "Estimate saved as a draft." };
  });
}

export async function submitEstimateToClient(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    if (!isId(workOrderId)) {
      return { ok: false, error: "Missing work order." };
    }
    const { optionType, rows } = linesFromForm(formData);
    const invalid = validateMtcQuote(formData, rows);
    if (invalid) return { ok: false, error: invalid };
    if (rows.length === 0) return { ok: false, error: "Add incurred and proposed lines before sending it to the client." };

    const { data: wo } = await supabase
      .from("work_orders")
      .select("id, wo_number, status")
      .eq("id", workOrderId)
      .maybeSingle();
    if (!wo) return { ok: false, error: "That work order no longer exists." };
    const status = wo.status as WorkOrderStatus;
    if (!CAN_SEND_ESTIMATE.includes(status)) {
      return {
        ok: false,
        error: `This work order is ${status.replace(/_/g, " ")} — estimates go out before close-out.`,
      };
    }

    await upsertQuote(supabase, workOrderId, optionType, "submitted", rows);
    if (status !== "quote_with_client") {
      const { data: updated, error } = await supabase
        .from("work_orders")
        .update({ status: "quote_with_client" })
        .eq("id", workOrderId)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(`Could not send the estimate: ${error.message}`);
      if (!updated) throw new Error("Could not send the estimate — the work order did not update.");
    }

    await logEvent(supabase, workOrderId, "quote_submitted", `Estimate submitted to client on ${wo.wo_number}`, {
      actorId: actor.id,
      actorName: actor.name,
      meta: { optionType },
    });

    const sharePath = `/e/${makeShareToken("e", workOrderId)}`;
    revalidatePath("/dashboard");
    revalidatePath("/work-orders");
    revalidatePath(`/work-orders/${workOrderId}`);
    return {
      ok: true,
      message: `Estimate sent on ${wo.wo_number}. Share the client link.`,
      sharePath,
    };
  });
}

export async function recordPublicEstimateDecision(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const token = String(formData.get("token") ?? "");
    const parsed = readShareToken(token);
    if (!parsed || parsed.kind !== "e") return { ok: false, error: "This estimate link isn't valid." };
    const decision = formData.get("decision") === "declined" ? "declined" : "approved";
    const decidedBy = String(formData.get("decidedBy") ?? "").trim();
    if (decidedBy.length < 2) return { ok: false, error: "Enter your name so we can record the decision." };

    const admin = createAdminClient();
    const { data: wo } = await admin
      .from("work_orders")
      .select("id, wo_number, status")
      .eq("id", parsed.workOrderId)
      .maybeSingle();
    if (!wo) return { ok: false, error: "This estimate is no longer available." };
    if (wo.status !== "quote_with_client") {
      return { ok: false, error: "This estimate has already been decided." };
    }

    const nowIso = new Date().toISOString();
    const toStatus: WorkOrderStatus = decision === "approved" ? "quote_approved" : "quote_declined";
    await admin
      .from("quotes")
      .update({
        status: decision,
        approved_by: decision === "approved" ? decidedBy : null,
        approved_at: decision === "approved" ? nowIso : null,
      })
      .eq("work_order_id", wo.id);
    await admin.from("work_orders").update({ status: toStatus }).eq("id", wo.id);
    await logEvent(admin, wo.id, "quote_decided", `Client ${decision} the estimate (${decidedBy})`, {
      actorName: decidedBy,
      meta: { decision, decidedBy, via: "public_link" },
    });

    revalidatePath(`/work-orders/${wo.id}`);
    revalidatePath("/dashboard");
    return {
      ok: true,
      message:
        decision === "approved"
          ? "Approved. MTC will schedule the work."
          : "Declined. MTC has been notified.",
    };
  });
}

export async function submitInvoiceToClient(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    if (!isId(workOrderId)) {
      return { ok: false, error: "Missing work order." };
    }
    const { data: wo } = await supabase
      .from("work_orders")
      .select("id, wo_number, status, nte, dne")
      .eq("id", workOrderId)
      .maybeSingle();
    if (!wo) return { ok: false, error: "That work order no longer exists." };

    const amount = Number(formData.get("amount") || wo.dne || wo.nte || 0);
    if (amount <= 0) return { ok: false, error: "Enter an invoice amount." };

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("work_order_id", workOrderId)
      .limit(1)
      .maybeSingle();
    const nowIso = new Date().toISOString();
    if (existing) {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "sent", amount, issued_at: nowIso })
        .eq("id", existing.id);
      if (error) throw new Error(`Could not send the invoice: ${error.message}`);
    } else {
      const { error } = await supabase.from("invoices").insert({
        invoice_number: `INV-${String(wo.wo_number).replace(/\D/g, "")}`,
        work_order_id: workOrderId,
        status: "sent",
        amount,
        issued_at: nowIso,
        due_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      });
      if (error) throw new Error(`Could not create the invoice: ${error.message}`);
    }

    if (["ready_to_bill", "ready_to_invoice"].includes(wo.status as string)) {
      await supabase.from("work_orders").update({ status: "invoiced" }).eq("id", workOrderId);
    }

    await logEvent(supabase, workOrderId, "quote_submitted", `Invoice sent to client · $${amount.toLocaleString()}`, {
      actorId: actor.id,
      actorName: actor.name,
      meta: { amount },
    });

    const sharePath = `/i/${makeShareToken("i", workOrderId)}`;
    revalidatePath("/billing");
    revalidatePath(`/work-orders/${workOrderId}`);
    const { fireAndForgetPush } = await import("@/lib/integrations/sync");
    fireAndForgetPush(workOrderId, "invoice");
    return {
      ok: true,
      message: `Invoice sent on ${wo.wo_number}. Share the client link.`,
      sharePath,
    };
  });
}

export async function recordCompletionPhotos(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    if (!isId(workOrderId)) {
      return { ok: false, error: "Missing work order." };
    }
    const before = String(formData.get("beforeUrls") ?? "")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));
    const after = String(formData.get("afterUrls") ?? "")
      .split(/\s+/)
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));
    if (before.length === 0 && after.length === 0) {
      return { ok: false, error: "Paste at least one photo link (https://…)." };
    }

    const { data: existing } = await supabase
      .from("completion_records")
      .select("work_order_id, before_photo_urls, after_photo_urls")
      .eq("work_order_id", workOrderId)
      .maybeSingle();

    const payload = {
      before_photo_urls: before.length ? before : ((existing?.before_photo_urls as string[]) ?? []),
      after_photo_urls: after.length ? after : ((existing?.after_photo_urls as string[]) ?? []),
    };

    if (existing) {
      const { error } = await supabase
        .from("completion_records")
        .update(payload)
        .eq("work_order_id", workOrderId);
      if (error) throw new Error(`Could not save photos: ${error.message}`);
    } else {
      const { error } = await supabase.from("completion_records").insert({
        work_order_id: workOrderId,
        ...payload,
      });
      if (error) throw new Error(`Could not save photos: ${error.message}`);
    }

    await logEvent(supabase, workOrderId, "attachment_added", "Completion photos attached", {
      actorId: actor.id,
      actorName: actor.name,
      meta: { before: payload.before_photo_urls.length, after: payload.after_photo_urls.length },
    });
    revalidatePath(`/work-orders/${workOrderId}`);
    return { ok: true, message: "Photo links saved." };
  });
}

export async function sendDeliveryToClient(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    if (!isId(workOrderId)) return { ok: false, error: "Missing work order." };

    const { data: wo } = await supabase
      .from("work_orders")
      .select("id, wo_number, description, status")
      .eq("id", workOrderId)
      .maybeSingle();
    if (!wo) return { ok: false, error: "That work order no longer exists." };

    const sharePath = `/d/${makeShareToken("d", workOrderId)}`;
    const { parseThread, serializeThread } = await import("@/lib/thread");
    const { data: row } = await supabase
      .from("completion_records")
      .select("technician_notes")
      .eq("work_order_id", workOrderId)
      .maybeSingle();
    const items = parseThread((row?.technician_notes as string | null) ?? null);
    items.unshift({
      id: crypto.randomUUID(),
      body: `Delivery packet sent for ${wo.wo_number}. Client link: ${sharePath}`,
      visibility: "client",
      authorName: actor.name,
      createdAt: new Date().toISOString(),
      channel: "email",
      audience: "client",
      contactName: String(formData.get("contactName") ?? "").trim() || null,
      contactValue: String(formData.get("contactValue") ?? "").trim() || null,
      outcome: "sent",
    });
    const payload = serializeThread(items);
    if (row) {
      await supabase
        .from("completion_records")
        .update({ technician_notes: payload })
        .eq("work_order_id", workOrderId);
    } else {
      await supabase.from("completion_records").insert({
        work_order_id: workOrderId,
        technician_notes: payload,
      });
    }

    await logEvent(supabase, workOrderId, "attachment_added", `Delivery sent to client on ${wo.wo_number}`, {
      actorId: actor.id,
      actorName: actor.name,
      meta: { sharePath },
    });
    revalidatePath(`/work-orders/${workOrderId}`);
    const { fireAndForgetPush } = await import("@/lib/integrations/sync");
    fireAndForgetPush(workOrderId, "delivery");
    return {
      ok: true,
      message: `Delivery packet ready for ${wo.wo_number}. Share the client link.`,
      sharePath,
    };
  });
}
