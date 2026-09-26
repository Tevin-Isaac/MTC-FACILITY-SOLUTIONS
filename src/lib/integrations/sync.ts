import "server-only";
import type { WorkOrderStatus } from "@/types/work-order";
import { serviceChannelConfigured, outlookConfigured } from "@/lib/integrations/config";
import {
  listOpenServiceChannelWorkOrders,
  postServiceChannelAttachment,
  postServiceChannelNote,
  updateServiceChannelStatus,
} from "@/lib/integrations/sc-client";
import { listUnreadIntakeMail, markOutlookRead } from "@/lib/integrations/outlook-client";
import { parseIntakeText, parseServiceChannelWorkOrder } from "@/lib/integrations/parse-intake";
import { upsertIntakeWorkOrder } from "@/lib/integrations/upsert-work-order";
import { createAdminClient } from "@/lib/supabase/admin";

const SC_STATUS: Partial<Record<WorkOrderStatus, { primary: string; extended?: string }>> = {
  new: { primary: "OPEN" },
  assigned: { primary: "OPEN", extended: "DISPATCH CONFIRMED" },
  schedule_confirmed: { primary: "OPEN", extended: "SCHEDULED" },
  tech_onsite: { primary: "IN PROGRESS", extended: "ON SITE" },
  pending_quote: { primary: "OPEN", extended: "WAITING FOR QUOTE" },
  quote_with_client: { primary: "OPEN", extended: "WAITING FOR APPROVAL" },
  quote_approved: { primary: "OPEN", extended: "APPROVED" },
  quote_declined: { primary: "OPEN", extended: "DECLINED" },
  work_completed: { primary: "COMPLETED" },
  pending_documentation: { primary: "COMPLETED", extended: "PENDING REVIEW" },
  in_quality_assurance: { primary: "COMPLETED", extended: "PENDING REVIEW" },
  ready_to_bill: { primary: "COMPLETED", extended: "COMPLETED/CONFIRMED" },
  ready_to_invoice: { primary: "INVOICED" },
  invoiced: { primary: "INVOICED" },
  paid: { primary: "INVOICED" },
  closed: { primary: "COMPLETED" },
  complete_no_charge: { primary: "COMPLETED" },
  cancelled: { primary: "CANCELED" },
  on_hold: { primary: "ON HOLD" },
};

export type SyncSummary = {
  serviceChannel: { pulled: number; created: number; updated: number; error: string | null };
  outlook: { pulled: number; created: number; updated: number; error: string | null };
};

export async function pullInboundWork(): Promise<SyncSummary> {
  const summary: SyncSummary = {
    serviceChannel: { pulled: 0, created: 0, updated: 0, error: null },
    outlook: { pulled: 0, created: 0, updated: 0, error: null },
  };

  if (serviceChannelConfigured()) {
    try {
      const rows = await listOpenServiceChannelWorkOrders();
      summary.serviceChannel.pulled = rows.length;
      for (const row of rows) {
        const result = await upsertIntakeWorkOrder(parseServiceChannelWorkOrder(row), "ServiceChannel");
        if (result.created) summary.serviceChannel.created += 1;
        else summary.serviceChannel.updated += 1;
      }
    } catch (error) {
      summary.serviceChannel.error = error instanceof Error ? error.message : "ServiceChannel pull failed.";
    }
  } else {
    summary.serviceChannel.error = "Not connected — add ServiceChannel credentials.";
  }

  if (outlookConfigured()) {
    try {
      const messages = await listUnreadIntakeMail();
      summary.outlook.pulled = messages.length;
      for (const message of messages) {
        const draft = parseIntakeText(message.body, message.subject);
        if (!draft.trackingNumber && !/work order|hvac|plumb|electr|leak|dispatch|servicechannel/i.test(`${message.subject} ${message.body}`)) {
          continue;
        }
        const result = await upsertIntakeWorkOrder(draft, message.from ?? "Outlook");
        if (result.created) summary.outlook.created += 1;
        else summary.outlook.updated += 1;
        await markOutlookRead(message.id);
      }
    } catch (error) {
      summary.outlook.error = error instanceof Error ? error.message : "Outlook pull failed.";
    }
  } else {
    summary.outlook.error = "Not connected — add Outlook Graph credentials, or forward mail to the webhook.";
  }

  return summary;
}

export async function pushWorkOrderToServiceChannel(
  workOrderId: string,
  kind: "status" | "note" | "delivery" | "invoice",
  payload?: { note?: string; urls?: string[] }
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (!serviceChannelConfigured()) {
    return { ok: false, error: "ServiceChannel is not connected yet." };
  }
  const admin = createAdminClient();
  const { data: wo } = await admin
    .from("work_orders")
    .select("id, wo_number, status, external_tracking_number, description")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo?.external_tracking_number) {
    return { ok: false, error: "This work order has no ServiceChannel tracking number." };
  }
  const tracking = String(wo.external_tracking_number);

  try {
    if (kind === "status") {
      const mapped = SC_STATUS[wo.status as WorkOrderStatus] ?? { primary: "OPEN" };
      await updateServiceChannelStatus(tracking, mapped.primary, mapped.extended);
      return { ok: true, message: `Pushed ${wo.wo_number} status to ServiceChannel.` };
    }
    if (kind === "note" && payload?.note) {
      await postServiceChannelNote(tracking, payload.note);
      return { ok: true, message: `Note posted to ServiceChannel on ${wo.wo_number}.` };
    }
    if (kind === "invoice") {
      await postServiceChannelNote(tracking, `Invoice submitted for ${wo.wo_number}.`);
      return { ok: true, message: `Invoice notice posted to ServiceChannel.` };
    }
    if (kind === "delivery") {
      const { data: completion } = await admin
        .from("completion_records")
        .select("before_photo_urls, after_photo_urls, root_cause, sign_off_name")
        .eq("work_order_id", workOrderId)
        .maybeSingle();
      const note = [
        `Delivery packet for ${wo.wo_number}.`,
        completion?.root_cause ? `Root cause: ${completion.root_cause}` : null,
        completion?.sign_off_name ? `Signed off by ${completion.sign_off_name}` : null,
      ]
        .filter(Boolean)
        .join(" ");
      await postServiceChannelNote(tracking, note);
      const urls = [
        ...((completion?.before_photo_urls as string[]) ?? []),
        ...((completion?.after_photo_urls as string[]) ?? []),
        ...(payload?.urls ?? []),
      ].slice(0, 8);
      for (const url of urls) {
        const file = await fetch(url);
        if (!file.ok) continue;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const name = url.split("/").pop()?.split("?")[0] || "photo.png";
        await postServiceChannelAttachment(tracking, name, bytes, file.headers.get("content-type") || "image/jpeg");
      }
      return { ok: true, message: `Delivery packet pushed to ServiceChannel.` };
    }
    return { ok: false, error: "Nothing to push." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "ServiceChannel push failed." };
  }
}

export function fireAndForgetPush(
  workOrderId: string,
  kind: "status" | "note" | "delivery" | "invoice",
  payload?: { note?: string; urls?: string[] }
) {
  if (!serviceChannelConfigured()) return;
  void pushWorkOrderToServiceChannel(workOrderId, kind, payload).catch(() => undefined);
}
