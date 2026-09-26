"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canTransition, STATUS_LABEL } from "@/lib/domain";
import type { WorkOrderStatus } from "@/types/work-order";

/* Server actions for every write the app performs.
 *
 * Two rules hold everywhere in this file:
 *   1. Every action re-checks the session. Server actions are reachable by
 *      direct POST, not only through our UI, so the caller is never trusted.
 *   2. Every mutation also appends a `work_order_events` row, so the activity
 *      timeline is a record of what happened rather than a guess. */

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const STATUSES = [
  "new",
  "assigned",
  "schedule_confirmed",
  "tech_onsite",
  "pending_quote",
  "quote_with_client",
  "quote_approved",
  "quote_declined",
  "work_completed",
  "pending_documentation",
  "in_quality_assurance",
  "ready_to_bill",
  "ready_to_invoice",
  "invoiced",
  "paid",
  "closed",
  "complete_no_charge",
  "cancelled",
  "on_hold",
] as const satisfies readonly WorkOrderStatus[];

const TRADES = [
  "plumbing",
  "hvac",
  "electrical",
  "doors",
  "roofing",
  "general_construction",
  "flooring",
  "locksmith",
  "fire_life_safety",
  "handyman",
] as const;

const PRIORITIES = [
  "emergency_same_day",
  "emergency_4_hour",
  "priority_24_hour",
  "standard_48_hour",
  "routine_scheduled",
] as const;

/** SLA windows in hours per priority, from MTC's FC training doc. */
const SLA_HOURS: Record<(typeof PRIORITIES)[number], { respond: number; resolve: number }> = {
  emergency_same_day: { respond: 1, resolve: 8 },
  emergency_4_hour: { respond: 1, resolve: 4 },
  priority_24_hour: { respond: 4, resolve: 24 },
  standard_48_hour: { respond: 8, resolve: 48 },
  routine_scheduled: { respond: 24, resolve: 120 },
};

type Actor = { id: string; name: string };

/**
 * Resolves the calling user, or throws. Everything in this module goes
 * through here first.
 */
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

  const actor: Actor = {
    id: user.id,
    name:
      (profile?.full_name as string | null) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      "Unknown user",
  };
  return { supabase, actor };
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
  supabase: Awaited<ReturnType<typeof createClient>>,
  actor: Actor,
  workOrderId: string,
  kind: string,
  summary: string,
  meta: Record<string, unknown> = {}
) {
  const { error } = await supabase.from("work_order_events").insert({
    work_order_id: workOrderId,
    kind,
    summary,
    actor_id: actor.id,
    actor_name: actor.name,
    meta,
  });
  if (!error) return;
  // Migration 0002 is not applied yet — keep the mutation itself working.
  if (tableMissing(error)) return;
  throw new Error(`Could not record activity: ${error.message}`);
}

async function nextWorkOrderNumber(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data, error } = await supabase.rpc("next_work_order_number");
  if (!error && data) return String(data);

  const { data: rows } = await supabase
    .from("work_orders")
    .select("wo_number")
    .order("wo_number", { ascending: false })
    .limit(20);
  const nums = (rows ?? [])
    .map((row) => parseInt(String(row.wo_number).replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n));
  const highest = nums.length ? Math.max(...nums) : 3099;
  return `WO-${highest + 1}`;
}

function revalidateWorkOrder(id?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/work-orders");
  if (id) revalidatePath(`/work-orders/${id}`);
}

/** Turns a thrown error into the result shape the UI toasts. */
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

const createSchema = z.object({
  siteId: z.string().uuid("Pick a site."),
  trade: z.enum(TRADES),
  priority: z.enum(PRIORITIES),
  description: z.string().trim().min(5, "Describe the problem in a few more words."),
  nte: z.coerce.number().nonnegative().nullable().catch(null),
  poNumber: z.string().trim().max(60).nullable().catch(null),
  reporterName: z.string().trim().max(120).nullable().catch(null),
  reporterCell: z.string().trim().max(40).nullable().catch(null),
  source: z.enum(["service_channel", "outlook_email", "phone", "manual"]).catch("manual"),
});

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createWorkOrder(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = createSchema.safeParse({
      siteId: formData.get("siteId"),
      trade: formData.get("trade"),
      priority: formData.get("priority"),
      description: formData.get("description"),
      nte: emptyToNull(formData.get("nte")),
      poNumber: emptyToNull(formData.get("poNumber")),
      reporterName: emptyToNull(formData.get("reporterName")),
      reporterCell: emptyToNull(formData.get("reporterCell")),
      source: formData.get("source") ?? "manual",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    }
    const input = parsed.data;

    const woNumber = await nextWorkOrderNumber(supabase);

    const now = new Date();
    const sla = SLA_HOURS[input.priority];
    // Client cap (DNE) is the vendor cap marked up at MTC's standard 18%.
    const dne = input.nte != null ? Math.round(input.nte * 1.18) : null;

    const { data: created, error } = await supabase
      .from("work_orders")
      .insert({
        wo_number: woNumber,
        site_id: input.siteId,
        trade: input.trade,
        priority: input.priority,
        status: "new" satisfies WorkOrderStatus,
        description: input.description,
        po_number: input.poNumber,
        nte: input.nte,
        dne,
        source: input.source,
        sla_respond_by: new Date(now.getTime() + sla.respond * 3_600_000).toISOString(),
        sla_resolve_by: new Date(now.getTime() + sla.resolve * 3_600_000).toISOString(),
        reporter_name: input.reporterName,
        reporter_cell: input.reporterCell,
      })
      .select("id, wo_number")
      .single();
    if (error) throw new Error(`Could not create the work order: ${error.message}`);

    await logEvent(
      supabase,
      actor,
      created.id as string,
      "created",
      `Work order created via ${input.source.replace(/_/g, " ")}`,
      { priority: input.priority, trade: input.trade, nte: input.nte }
    );

    revalidateWorkOrder(created.id as string);
    return { ok: true, message: `${created.wo_number} created.` };
  });
}

const statusSchema = z.object({
  workOrderId: z.string().uuid(),
  toStatus: z.enum(STATUSES),
  note: z.string().trim().max(500).nullable().catch(null),
});

export async function changeStatus(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = statusSchema.safeParse({
      workOrderId: formData.get("workOrderId"),
      toStatus: formData.get("toStatus"),
      note: emptyToNull(formData.get("note")),
    });
    if (!parsed.success) return { ok: false, error: "That status change isn't valid." };
    const { workOrderId, toStatus, note } = parsed.data;

    const { data: current, error: readError } = await supabase
      .from("work_orders")
      .select("id, wo_number, status, vendor_id")
      .eq("id", workOrderId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) return { ok: false, error: "That work order no longer exists." };

    const fromStatus = current.status as WorkOrderStatus;
    if (fromStatus === toStatus) {
      return { ok: true, message: `Already ${STATUS_LABEL[toStatus]}.` };
    }
    if (!canTransition(fromStatus, toStatus)) {
      return {
        ok: false,
        error: `${STATUS_LABEL[fromStatus]} can't move straight to ${STATUS_LABEL[toStatus]}.`,
      };
    }
    // The dispatch gate: a work order can't be Assigned without a vendor.
    if (toStatus === "assigned" && !current.vendor_id) {
      return { ok: false, error: "Assign a vendor before moving this to Assigned." };
    }
    if (toStatus === "ready_to_bill") {
      const { data: completion } = await supabase
        .from("completion_records")
        .select("sign_off_at")
        .eq("work_order_id", workOrderId)
        .maybeSingle();
      if (!completion?.sign_off_at) {
        return {
          ok: false,
          error: "Record a manager sign-off before sending this to billing.",
        };
      }
    }

    if (toStatus === "quote_with_client") {
      await ensureSubmittedQuote(supabase, workOrderId);
    }
    if (toStatus === "ready_to_invoice" || toStatus === "invoiced") {
      await ensureInvoice(
        supabase,
        workOrderId,
        toStatus === "invoiced" ? "sent" : "draft"
      );
    }
    if (toStatus === "paid") {
      await supabase
        .from("invoices")
        .update({ status: "paid" })
        .eq("work_order_id", workOrderId);
    }

    const terminal = ["closed", "complete_no_charge", "cancelled"].includes(toStatus);
    const { error } = await supabase
      .from("work_orders")
      .update({
        status: toStatus,
        closed_at: terminal ? new Date().toISOString() : null,
      })
      .eq("id", workOrderId);
    if (error) throw new Error(`Could not update the status: ${error.message}`);

    await logEvent(
      supabase,
      actor,
      workOrderId,
      "status_changed",
      note
        ? `${STATUS_LABEL[fromStatus]} → ${STATUS_LABEL[toStatus]} — ${note}`
        : `${STATUS_LABEL[fromStatus]} → ${STATUS_LABEL[toStatus]}`,
      { from: fromStatus, to: toStatus }
    );

    revalidateWorkOrder(workOrderId);
    return {
      ok: true,
      message: `${current.wo_number} is now ${STATUS_LABEL[toStatus]}.`,
    };
  });
}

const assignSchema = z.object({
  workOrderId: z.string().uuid(),
  vendorId: z.string().uuid("Pick a vendor."),
});

export async function assignVendor(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = assignSchema.safeParse({
      workOrderId: formData.get("workOrderId"),
      vendorId: formData.get("vendorId"),
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Pick a vendor." };
    const { workOrderId, vendorId } = parsed.data;

    const [{ data: wo }, { data: vendor }] = await Promise.all([
      supabase
        .from("work_orders")
        .select("id, wo_number, status, vendor_id")
        .eq("id", workOrderId)
        .maybeSingle(),
      supabase
        .from("vendors")
        .select("id, name, active, coi_expires_at, license_expires_at")
        .eq("id", vendorId)
        .maybeSingle(),
    ]);
    if (!wo) return { ok: false, error: "That work order no longer exists." };
    if (!vendor) return { ok: false, error: "That vendor no longer exists." };
    if (!vendor.active) return { ok: false, error: `${vendor.name} is marked inactive.` };

    // Compliance gate. The review found an expired vendor still dispatched on
    // live work orders, so this is enforced server-side, not just greyed out.
    const today = new Date();
    const expired = (
      [vendor.coi_expires_at, vendor.license_expires_at] as (string | null)[]
    ).some((d) => d != null && new Date(d) < today);
    if (expired) {
      return {
        ok: false,
        error: `${vendor.name} has expired compliance documents — dispatch is blocked until they're renewed.`,
      };
    }

    const replacing = wo.vendor_id != null && wo.vendor_id !== vendorId;
    const { error } = await supabase
      .from("work_orders")
      .update({ vendor_id: vendorId })
      .eq("id", workOrderId);
    if (error) throw new Error(`Could not assign the vendor: ${error.message}`);

    await logEvent(
      supabase,
      actor,
      workOrderId,
      replacing ? "vendor_changed" : "vendor_assigned",
      replacing ? `Vendor changed to ${vendor.name}` : `Dispatched to ${vendor.name}`,
      { vendorId, vendorName: vendor.name }
    );

    revalidateWorkOrder(workOrderId);
    return { ok: true, message: `${wo.wo_number} dispatched to ${vendor.name}.` };
  });
}

const noteSchema = z.object({
  workOrderId: z.string().uuid(),
  body: z.string().trim().min(1, "Write something first.").max(4000),
  visibility: z.enum(["internal", "client"]).catch("internal"),
});

export async function addNote(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = noteSchema.safeParse({
      workOrderId: formData.get("workOrderId"),
      body: formData.get("body"),
      visibility: formData.get("visibility") ?? "internal",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Write something first." };
    }
    const { workOrderId, body, visibility } = parsed.data;

    await writeFallbackNote(supabase, workOrderId, {
      body,
      visibility,
      authorName: actor.name,
    });
    const { error } = await supabase.from("work_order_notes").insert({
      work_order_id: workOrderId,
      body,
      visibility,
      author_id: actor.id,
      author_name: actor.name,
    });
    if (error && !tableMissing(error)) {
      throw new Error(`Could not save the note: ${error.message}`);
    }

    await logEvent(
      supabase,
      actor,
      workOrderId,
      "note_added",
      visibility === "client" ? "Client-visible note added" : "Internal note added",
      { visibility }
    );

    revalidateWorkOrder(workOrderId);
    return {
      ok: true,
      message: visibility === "client" ? "Client-visible note added." : "Note added.",
    };
  });
}

const nteSchema = z.object({
  workOrderId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter the new NTE amount."),
  approvedBy: z.string().trim().min(2, "Who approved it?"),
  method: z.enum(["phone", "email", "sms"]),
  note: z.string().trim().max(500).nullable().catch(null),
});

export async function raiseNte(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = nteSchema.safeParse({
      workOrderId: formData.get("workOrderId"),
      amount: formData.get("amount"),
      approvedBy: formData.get("approvedBy"),
      method: formData.get("method"),
      note: emptyToNull(formData.get("note")),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the amount." };
    }
    const { workOrderId, amount, approvedBy, method, note } = parsed.data;

    const { data: wo } = await supabase
      .from("work_orders")
      .select("id, wo_number, nte")
      .eq("id", workOrderId)
      .maybeSingle();
    if (!wo) return { ok: false, error: "That work order no longer exists." };

    const previous = wo.nte != null ? Number(wo.nte) : null;
    if (previous != null && amount <= previous) {
      return {
        ok: false,
        error: `The NTE is already $${previous.toLocaleString()} — a new limit has to be higher.`,
      };
    }

    const { error: insertError } = await supabase.from("nte_increases").insert({
      work_order_id: workOrderId,
      amount,
      approved_by: approvedBy,
      method,
      note,
    });
    if (insertError) throw new Error(`Could not log the increase: ${insertError.message}`);

    const dneBump =
      previous != null
        ? Math.round(amount * 1.18)
        : Math.round(amount * 1.18);
    const { error: updateError } = await supabase
      .from("work_orders")
      .update({ nte: amount, dne: dneBump })
      .eq("id", workOrderId);
    if (updateError) throw new Error(`Could not raise the NTE: ${updateError.message}`);

    await logEvent(
      supabase,
      actor,
      workOrderId,
      "nte_increased",
      `NTE raised to $${amount.toLocaleString()} by ${approvedBy} (${method})`,
      { from: previous, to: amount, approvedBy, method }
    );

    revalidateWorkOrder(workOrderId);
    return { ok: true, message: `NTE raised to $${amount.toLocaleString()}.` };
  });
}

const decisionSchema = z.object({
  workOrderId: z.string().uuid(),
  decision: z.enum(["approved", "declined"]),
  decidedBy: z.string().trim().min(2, "Who gave the decision?"),
  note: z.string().trim().max(500).nullable().catch(null),
});

/**
 * Records the client's answer on a quote. This is the one step the primary
 * next-step button can't do on its own, since it needs to know who said what.
 */
export async function recordQuoteDecision(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = decisionSchema.safeParse({
      workOrderId: formData.get("workOrderId"),
      decision: formData.get("decision"),
      decidedBy: formData.get("decidedBy"),
      note: emptyToNull(formData.get("note")),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the decision." };
    }
    const { workOrderId, decision, decidedBy, note } = parsed.data;

    const { data: wo } = await supabase
      .from("work_orders")
      .select("id, wo_number, status")
      .eq("id", workOrderId)
      .maybeSingle();
    if (!wo) return { ok: false, error: "That work order no longer exists." };

    const toStatus: WorkOrderStatus =
      decision === "approved" ? "quote_approved" : "quote_declined";
    const fromStatus = wo.status as WorkOrderStatus;
    if (!canTransition(fromStatus, toStatus)) {
      return {
        ok: false,
        error: `A decision can only be recorded while the quote is with the client (this one is ${STATUS_LABEL[fromStatus]}).`,
      };
    }

    await ensureSubmittedQuote(supabase, workOrderId);

    const nowIso = new Date().toISOString();
    const { error: quoteError } = await supabase
      .from("quotes")
      .update({
        status: decision,
        approved_by: decision === "approved" ? decidedBy : null,
        approved_at: decision === "approved" ? nowIso : null,
      })
      .eq("work_order_id", workOrderId);
    if (quoteError) throw new Error(`Could not update the quote: ${quoteError.message}`);

    const { error } = await supabase
      .from("work_orders")
      .update({ status: toStatus })
      .eq("id", workOrderId);
    if (error) throw new Error(`Could not update the work order: ${error.message}`);

    await logEvent(
      supabase,
      actor,
      workOrderId,
      "quote_decided",
      note
        ? `Client ${decision} the quote (${decidedBy}) — ${note}`
        : `Client ${decision} the quote (${decidedBy})`,
      { decision, decidedBy }
    );

    revalidateWorkOrder(workOrderId);
    return {
      ok: true,
      message: `Recorded: client ${decision} the quote on ${wo.wo_number}.`,
    };
  });
}

async function ensureSubmittedQuote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workOrderId: string
) {
  const { data: existing } = await supabase
    .from("quotes")
    .select("id")
    .eq("work_order_id", workOrderId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("quotes")
      .update({ status: "submitted" })
      .eq("id", existing.id)
      .in("status", ["draft", "submitted"]);
    return;
  }
  await supabase.from("quotes").insert({
    work_order_id: workOrderId,
    option_type: "repair_vs_replace",
    status: "submitted",
  });
}

async function ensureInvoice(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workOrderId: string,
  status: "draft" | "sent"
) {
  const { data: wo } = await supabase
    .from("work_orders")
    .select("wo_number, nte, dne")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return;
  const amount = Number(wo.dne ?? wo.nte ?? 0);
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("work_order_id", workOrderId)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("invoices")
      .update({ status, amount, issued_at: new Date().toISOString() })
      .eq("id", existing.id);
    return;
  }
  await supabase.from("invoices").insert({
    invoice_number: `INV-${String(wo.wo_number).replace(/\D/g, "")}`,
    work_order_id: workOrderId,
    status,
    amount,
    issued_at: new Date().toISOString(),
    due_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  });
}

async function writeFallbackNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workOrderId: string,
  note: { body: string; visibility: "internal" | "client"; authorName: string }
) {
  const { data: row } = await supabase
    .from("completion_records")
    .select("technician_notes")
    .eq("work_order_id", workOrderId)
    .maybeSingle();

  let notes: Array<{
    id: string;
    body: string;
    visibility: "internal" | "client";
    authorName: string | null;
    createdAt: string;
  }> = [];
  const raw = (row?.technician_notes as string | null) ?? null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { notes?: typeof notes };
      if (Array.isArray(parsed.notes)) notes = parsed.notes;
      else notes = [{
        id: "legacy",
        body: raw,
        visibility: "internal",
        authorName: null,
        createdAt: new Date(0).toISOString(),
      }];
    } catch {
      notes = [{
        id: "legacy",
        body: raw,
        visibility: "internal",
        authorName: null,
        createdAt: new Date(0).toISOString(),
      }];
    }
  }
  notes.unshift({
    id: crypto.randomUUID(),
    body: note.body,
    visibility: note.visibility,
    authorName: note.authorName,
    createdAt: new Date().toISOString(),
  });
  const payload = { notes };

  if (row) {
    const { error } = await supabase
      .from("completion_records")
      .update({ technician_notes: JSON.stringify(payload) })
      .eq("work_order_id", workOrderId);
    if (error) throw new Error(`Could not save the note: ${error.message}`);
    return;
  }
  const { error } = await supabase.from("completion_records").insert({
    work_order_id: workOrderId,
    technician_notes: JSON.stringify(payload),
  });
  if (error) throw new Error(`Could not save the note: ${error.message}`);
}

export async function recordSignOff(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    const name = String(formData.get("signOffName") ?? "").trim();
    if (!workOrderId || name.length < 2) {
      return { ok: false, error: "Enter the manager's name to sign off." };
    }

    const { data: existing } = await supabase
      .from("completion_records")
      .select("work_order_id")
      .eq("work_order_id", workOrderId)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    if (existing) {
      const { error } = await supabase
        .from("completion_records")
        .update({ sign_off_name: name, sign_off_at: nowIso })
        .eq("work_order_id", workOrderId);
      if (error) throw new Error(`Could not record sign-off: ${error.message}`);
    } else {
      const { error } = await supabase.from("completion_records").insert({
        work_order_id: workOrderId,
        sign_off_name: name,
        sign_off_at: nowIso,
      });
      if (error) throw new Error(`Could not record sign-off: ${error.message}`);
    }

    await logEvent(
      supabase,
      actor,
      workOrderId,
      "sign_off_recorded",
      `Sign-off recorded by ${name}`,
      { name }
    );
    revalidateWorkOrder(workOrderId);
    return { ok: true, message: `Sign-off recorded for ${name}.` };
  });
}
