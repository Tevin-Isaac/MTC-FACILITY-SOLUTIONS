"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canTransition, STATUS_LABEL } from "@/lib/domain";
import { ID_SHAPE, isId } from "@/lib/ids";
import { parseThread, serializeThread, type ThreadItem } from "@/lib/thread";
import type { WorkOrderStatus } from "@/types/work-order";

/* Server actions for every write the app performs.
 *
 * Two rules hold everywhere in this file:
 *   1. Every action re-checks the session. Server actions are reachable by
 *      direct POST, not only through our UI, so the caller is never trusted.
 *   2. Every mutation also appends a `work_order_events` row, so the activity
 *      timeline is a record of what happened rather than a guess. */

export type ActionResult =
  | { ok: true; message: string; sharePath?: string; workOrderId?: string }
  | { ok: false; error: string };

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
  revalidatePath("/clients");
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

const createSchema = z
  .object({
    jobKind: z.enum(["commercial", "residential"]).catch("commercial"),
    newHome: z.enum(["yes", "no"]).catch("no"),
    siteId: z.string().regex(ID_SHAPE).nullable().catch(null),
    homeownerName: z.string().trim().max(120).nullable().catch(null),
    homeAddress: z.string().trim().max(240).nullable().catch(null),
    homePhone: z.string().trim().max(40).nullable().catch(null),
    homeEmail: z.string().trim().max(120).nullable().catch(null),
    trade: z.enum(TRADES),
    priority: z.enum(PRIORITIES),
    description: z.string().trim().min(5, "Describe the problem in a few more words."),
    nte: z.coerce.number().nonnegative().nullable().catch(null),
    poNumber: z.string().trim().max(60).nullable().catch(null),
    reporterName: z.string().trim().max(120).nullable().catch(null),
    reporterCell: z.string().trim().max(40).nullable().catch(null),
    source: z.enum(["service_channel", "outlook_email", "phone", "manual"]).catch("manual"),
  })
  .superRefine((value, ctx) => {
    if (value.newHome === "yes") {
      if (!value.homeownerName || value.homeownerName.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the homeowner's name.",
          path: ["homeownerName"],
        });
      }
      if (!value.homeAddress || value.homeAddress.length < 6) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the home address.",
          path: ["homeAddress"],
        });
      }
      return;
    }
    if (!value.siteId) {
      ctx.addIssue({
        code: "custom",
        message: "Pick a site or home.",
        path: ["siteId"],
      });
    }
  });

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s === "" ? null : s;
}

export async function createWorkOrder(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = createSchema.safeParse({
      jobKind: formData.get("jobKind") ?? "commercial",
      newHome: formData.get("newHome") ?? "no",
      siteId: emptyToNull(formData.get("siteId")),
      homeownerName: emptyToNull(formData.get("homeownerName")),
      homeAddress: emptyToNull(formData.get("homeAddress")),
      homePhone: emptyToNull(formData.get("homePhone")),
      homeEmail: emptyToNull(formData.get("homeEmail")),
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

    let siteId = input.siteId;
    if (input.newHome === "yes") {
      const home = await insertAccountSite(supabase, {
        type: "residential",
        name: input.homeownerName!,
        siteName: `${input.homeownerName} residence`,
        address: input.homeAddress!,
        contactName: input.homeownerName,
        contactPhone: input.homePhone,
        contactEmail: input.homeEmail,
      });
      siteId = home.siteId;
    }
    if (!siteId) return { ok: false, error: "Pick a site or home." };

    const woNumber = await nextWorkOrderNumber(supabase);

    const now = new Date();
    const sla = SLA_HOURS[input.priority];
    // Client cap (DNE) is the vendor cap marked up at MTC's standard 18%.
    const dne = input.nte != null ? Math.round(input.nte * 1.18) : null;
    const source =
      input.jobKind === "residential" && input.source === "service_channel"
        ? "phone"
        : input.source;

    const { data: created, error } = await supabase
      .from("work_orders")
      .insert({
        wo_number: woNumber,
        site_id: siteId,
        trade: input.trade,
        priority: input.priority,
        status: "new" satisfies WorkOrderStatus,
        description: input.description,
        po_number: input.poNumber,
        nte: input.nte,
        dne,
        source,
        sla_respond_by: new Date(now.getTime() + sla.respond * 3_600_000).toISOString(),
        sla_resolve_by: new Date(now.getTime() + sla.resolve * 3_600_000).toISOString(),
        reporter_name: input.reporterName ?? input.homeownerName,
        reporter_cell: input.reporterCell ?? input.homePhone,
      })
      .select("id, wo_number")
      .single();
    if (error) throw new Error(`Could not create the work order: ${error.message}`);

    await logEvent(
      supabase,
      actor,
      created.id as string,
      "created",
      `Work order created via ${source.replace(/_/g, " ")}`,
      { priority: input.priority, trade: input.trade, nte: input.nte, jobKind: input.jobKind }
    );

    revalidateWorkOrder(created.id as string);
    return { ok: true, message: `${created.wo_number} created.` };
  });
}

const statusSchema = z.object({
  workOrderId: z.string().regex(ID_SHAPE),
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
        .select("sign_off_at, before_photo_urls, after_photo_urls")
        .eq("work_order_id", workOrderId)
        .maybeSingle();
      const before = ((completion?.before_photo_urls as string[]) ?? []).length;
      const after = ((completion?.after_photo_urls as string[]) ?? []).length;
      if (before === 0 || after === 0) {
        return {
          ok: false,
          error: "Upload before and after photos before sending this to billing.",
        };
      }
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
    const { fireAndForgetPush } = await import("@/lib/integrations/sync");
    fireAndForgetPush(workOrderId, "status");
    return {
      ok: true,
      message: `${current.wo_number} is now ${STATUS_LABEL[toStatus]}.`,
    };
  });
}

const assignSchema = z.object({
  workOrderId: z.string().regex(ID_SHAPE),
  vendorId: z.string().regex(ID_SHAPE, "Pick a vendor."),
});

const dispatchSchema = assignSchema.extend({
  scheduledAt: z.string().min(1, "Pick when the tech should arrive."),
  note: z.string().trim().max(2000).nullable().catch(null),
  notifyBy: z.enum(["phone", "email", "in_app"]).catch("phone"),
});

async function insertAccountSite(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    type: "commercial" | "residential";
    name: string;
    siteName: string;
    address: string;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    storeCode?: string | null;
  }
) {
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({ name: input.name, type: input.type })
    .select("id")
    .single();
  if (accountError) throw new Error(`Could not create the client: ${accountError.message}`);

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .insert({
      account_id: account.id,
      name: input.siteName,
      address: input.address,
      contact_name: input.contactName,
      contact_phone: input.contactPhone,
      contact_email: input.contactEmail,
      store_code: input.storeCode ?? null,
    })
    .select("id")
    .single();
  if (siteError) throw new Error(`Could not create the site: ${siteError.message}`);
  return { accountId: account.id as string, siteId: site.id as string };
}

export async function createAccount(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase } = await requireActor();
    const type = formData.get("type") === "residential" ? "residential" : "commercial";
    const name = String(formData.get("name") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const contactName = emptyToNull(formData.get("contactName"));
    const contactPhone = emptyToNull(formData.get("contactPhone"));
    const contactEmail = emptyToNull(formData.get("contactEmail"));
    const storeCode = emptyToNull(formData.get("storeCode"));
    const siteName = emptyToNull(formData.get("siteName"));

    if (name.length < 2) return { ok: false, error: "Enter the client or homeowner name." };
    if (address.length < 6) return { ok: false, error: "Enter the address." };

    const created = await insertAccountSite(supabase, {
      type,
      name,
      siteName:
        siteName ??
        (type === "residential" ? `${name} residence` : name),
      address,
      contactName: contactName ?? name,
      contactPhone,
      contactEmail,
      storeCode,
    });

    revalidatePath("/clients");
    revalidatePath(`/clients/${created.accountId}`);
    revalidatePath("/work-orders/new");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message:
        type === "residential"
          ? `${name} added as a residential client.`
          : `${name} added as a corporate client.`,
    };
  });
}

export async function assignVendor(formData: FormData): Promise<ActionResult> {
  return dispatchWorkOrder(formData);
}

export async function dispatchWorkOrder(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = dispatchSchema.safeParse({
      workOrderId: formData.get("workOrderId"),
      vendorId: formData.get("vendorId"),
      scheduledAt: formData.get("scheduledAt") ?? "",
      note: emptyToNull(formData.get("note")),
      notifyBy: formData.get("notifyBy") ?? "phone",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Finish the dispatch details." };
    }
    const { workOrderId, vendorId, scheduledAt, note, notifyBy } = parsed.data;
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: "That arrival time isn't valid." };
    }

    const [{ data: wo }, { data: vendor }] = await Promise.all([
      supabase
        .from("work_orders")
        .select("id, wo_number, status, vendor_id, site_id, trade, priority, nte, description")
        .eq("id", workOrderId)
        .maybeSingle(),
      supabase
        .from("vendors")
        .select("id, name, active, coi_expires_at, license_expires_at, phone, email")
        .eq("id", vendorId)
        .maybeSingle(),
    ]);
    if (!wo) return { ok: false, error: "That work order no longer exists." };
    if (!vendor) return { ok: false, error: "That vendor no longer exists." };
    if (!vendor.active) return { ok: false, error: `${vendor.name} is marked inactive.` };

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

    const { data: site } = await supabase
      .from("sites")
      .select("name, address, contact_name, contact_phone")
      .eq("id", wo.site_id)
      .maybeSingle();

    const scheduledLabel = when.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    const nextStatus =
      wo.status === "new" || wo.status === "on_hold" ? ("assigned" as WorkOrderStatus) : null;
    const replacing = wo.vendor_id != null && wo.vendor_id !== vendorId;
    const { data: updated, error } = await supabase
      .from("work_orders")
      .update({
        vendor_id: vendorId,
        ...(nextStatus ? { status: nextStatus } : {}),
      })
      .eq("id", workOrderId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Could not dispatch: ${error.message}`);
    if (!updated) {
      throw new Error("Could not dispatch — the work order was not updated.");
    }

    const packet = [
      `DISPATCH ${wo.wo_number}`,
      `Vendor: ${vendor.name}`,
      `Arrive: ${scheduledLabel} CT`,
      `Trade: ${String(wo.trade).replace(/_/g, " ")}`,
      `Site: ${site?.name ?? "Unknown"}`,
      `Address: ${site?.address ?? "—"}`,
      site?.contact_name
        ? `On-site: ${site.contact_name}${site.contact_phone ? ` · ${site.contact_phone}` : ""}`
        : null,
      wo.nte != null ? `NTE: $${Number(wo.nte).toLocaleString("en-US")}` : null,
      `Scope: ${wo.description}`,
      note ? `Notes: ${note}` : null,
      `Notify: ${notifyBy}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await writeFallbackNote(supabase, workOrderId, {
        body: packet,
        visibility: "client",
        authorName: actor.name,
        channel: "visit",
        audience: "vendor",
        outcome: "sent",
      });
    } catch {
      // Notes table/fallback can miss — the dispatch itself already wrote.
    }

    await logEvent(
      supabase,
      actor,
      workOrderId,
      replacing ? "vendor_changed" : "vendor_assigned",
      replacing
        ? `Redispatched to ${vendor.name} · ${scheduledLabel}`
        : `Dispatched to ${vendor.name} · arrive ${scheduledLabel}`,
      {
        vendorId,
        vendorName: vendor.name,
        vendorPhone: vendor.phone,
        vendorEmail: vendor.email,
        scheduledAt: when.toISOString(),
        notifyBy,
        note,
      }
    );

    return {
      ok: true,
      message: `${wo.wo_number} dispatched to ${vendor.name} for ${scheduledLabel}.`,
    };
  });
}

const noteSchema = z.object({
  workOrderId: z.string().regex(ID_SHAPE),
  body: z.string().trim().min(1, "Write something first.").max(4000),
  visibility: z.enum(["internal", "client"]).catch("internal"),
  channel: z.enum(["note", "call", "email", "sms", "visit"]).catch("note"),
  audience: z.enum(["internal", "client", "vendor"]).catch("internal"),
  contactName: z.string().trim().max(120).nullable().catch(null),
  contactValue: z.string().trim().max(200).nullable().catch(null),
  outcome: z.enum(["logged", "connected", "voicemail", "no_answer", "sent"]).nullable().catch(null),
});

export async function addNote(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();

    const parsed = noteSchema.safeParse({
      workOrderId: formData.get("workOrderId"),
      body: formData.get("body"),
      visibility: formData.get("visibility") ?? "internal",
      channel: formData.get("channel") ?? "note",
      audience: formData.get("audience") ?? formData.get("visibility") ?? "internal",
      contactName: emptyToNull(formData.get("contactName")),
      contactValue: emptyToNull(formData.get("contactValue")),
      outcome: emptyToNull(formData.get("outcome")),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Write something first." };
    }
    const { workOrderId, body, visibility, channel, audience, contactName, contactValue, outcome } =
      parsed.data;

    await writeFallbackNote(supabase, workOrderId, {
      body,
      visibility,
      authorName: actor.name,
      channel,
      audience,
      contactName,
      contactValue,
      outcome,
    });
    if (channel === "note") {
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
    }

    const summary =
      channel === "call"
        ? `Call ${outcome ? `· ${outcome.replace(/_/g, " ")}` : "logged"} — ${contactName ?? "contact"}`
        : channel === "email"
          ? `Email sent — ${contactName ?? contactValue ?? "contact"}`
          : channel === "sms"
            ? `Text sent — ${contactName ?? contactValue ?? "contact"}`
            : visibility === "client"
              ? "Client-visible note added"
              : "Internal note added";

    await logEvent(supabase, actor, workOrderId, "note_added", summary, {
      visibility,
      channel,
      audience,
      outcome,
    });

    revalidateWorkOrder(workOrderId);
    if (visibility === "client" || audience === "client") {
      const { fireAndForgetPush } = await import("@/lib/integrations/sync");
      fireAndForgetPush(workOrderId, "note", { note: body });
    }
    return {
      ok: true,
      message:
        channel === "note"
          ? visibility === "client"
            ? "Client-visible note added."
            : "Note added."
          : `${channel === "sms" ? "Text" : channel[0].toUpperCase() + channel.slice(1)} logged.`,
    };
  });
}

const nteSchema = z.object({
  workOrderId: z.string().regex(ID_SHAPE),
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
  workOrderId: z.string().regex(ID_SHAPE),
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
  note: {
    body: string;
    visibility: "internal" | "client";
    authorName: string;
    channel?: ThreadItem["channel"];
    audience?: ThreadItem["audience"];
    contactName?: string | null;
    contactValue?: string | null;
    outcome?: ThreadItem["outcome"];
  }
) {
  const { data: row } = await supabase
    .from("completion_records")
    .select("technician_notes")
    .eq("work_order_id", workOrderId)
    .maybeSingle();

  const notes = parseThread((row?.technician_notes as string | null) ?? null);
  notes.unshift({
    id: crypto.randomUUID(),
    body: note.body,
    visibility: note.visibility,
    authorName: note.authorName,
    createdAt: new Date().toISOString(),
    channel: note.channel ?? "note",
    audience: note.audience ?? (note.visibility === "client" ? "client" : "internal"),
    contactName: note.contactName ?? null,
    contactValue: note.contactValue ?? null,
    outcome: note.outcome ?? null,
  });
  const payload = serializeThread(notes);

  if (row) {
    const { error } = await supabase
      .from("completion_records")
      .update({ technician_notes: payload })
      .eq("work_order_id", workOrderId);
    if (error) throw new Error(`Could not save the note: ${error.message}`);
    return;
  }
  const { error } = await supabase.from("completion_records").insert({
    work_order_id: workOrderId,
    technician_notes: payload,
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

    let signatureUrl: string | null = null;
    const signature = String(formData.get("signatureDataUrl") ?? "");
    if (signature.startsWith("data:image/")) {
      const { saveSignOffSignature } = await import("@/lib/actions/files");
      signatureUrl = await saveSignOffSignature(workOrderId, signature);
    }

    const { data: existing } = await supabase
      .from("completion_records")
      .select("work_order_id")
      .eq("work_order_id", workOrderId)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const patch = {
      sign_off_name: name,
      sign_off_at: nowIso,
      ...(signatureUrl ? { sign_off_signature_url: signatureUrl } : {}),
    };
    if (existing) {
      const { error } = await supabase
        .from("completion_records")
        .update(patch)
        .eq("work_order_id", workOrderId);
      if (error) throw new Error(`Could not record sign-off: ${error.message}`);
    } else {
      const { error } = await supabase.from("completion_records").insert({
        work_order_id: workOrderId,
        ...patch,
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

export async function setPurchaseOrder(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const { supabase, actor } = await requireActor();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    const poNumber = String(formData.get("poNumber") ?? "").trim();
    if (!isId(workOrderId)) return { ok: false, error: "Missing work order." };
    if (poNumber.length < 2) return { ok: false, error: "Enter a PO or reference number." };
    const { data: updated, error } = await supabase
      .from("work_orders")
      .update({ po_number: poNumber })
      .eq("id", workOrderId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(`Could not save the PO: ${error.message}`);
    if (!updated) return { ok: false, error: "Could not save the PO — try again." };
    await logEvent(supabase, actor, workOrderId, "po_saved", `PO ${poNumber} saved`, { poNumber });
    revalidateWorkOrder(workOrderId);
    return { ok: true, message: `PO ${poNumber} saved.` };
  });
}
