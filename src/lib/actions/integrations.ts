"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/work-orders";
import { parseIntakeText } from "@/lib/integrations/parse-intake";
import { upsertIntakeWorkOrder } from "@/lib/integrations/upsert-work-order";
import { pullInboundWork, pushWorkOrderToServiceChannel } from "@/lib/integrations/sync";
import {
  intakeWebhookSecret,
  outlookConfigured,
  serviceChannelConfigured,
} from "@/lib/integrations/config";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to do that.");
  return user;
}

export async function importIntakeEmail(formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const raw = String(formData.get("emailBody") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim() || null;
    if (raw.length < 12) return { ok: false, error: "Paste the ServiceChannel or Outlook email." };
    const result = await upsertIntakeWorkOrder(parseIntakeText(raw, subject), "Outlook");
    revalidatePath("/intake");
    return {
      ok: true,
      message: result.created
        ? `${result.woNumber} created from the email.`
        : `${result.woNumber} already on file — details refreshed.`,
      workOrderId: result.workOrderId,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not import that email." };
  }
}

export async function pullIntegrationsNow(): Promise<ActionResult> {
  try {
    await assertAdmin();
    const summary = await pullInboundWork();
    const created = summary.serviceChannel.created + summary.outlook.created;
    const updated = summary.serviceChannel.updated + summary.outlook.updated;
    revalidatePath("/intake");
    revalidatePath("/work-orders");
    revalidatePath("/dashboard");
    revalidatePath("/admin");
    if (created + updated === 0 && (summary.serviceChannel.error || summary.outlook.error)) {
      return {
        ok: false,
        error: [summary.serviceChannel.error, summary.outlook.error].filter(Boolean).join(" "),
      };
    }
    return {
      ok: true,
      message:
        created + updated === 0
          ? "No new work orders waiting in ServiceChannel or Outlook."
          : `Intake pulled ${created} new and refreshed ${updated} existing work orders.`,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Pull failed." };
  }
}

export async function pushWorkOrderNow(formData: FormData): Promise<ActionResult> {
  try {
    await requireUser();
    const workOrderId = String(formData.get("workOrderId") ?? "");
    const kind = String(formData.get("kind") ?? "status") as "status" | "note" | "delivery" | "invoice";
    return await pushWorkOrderToServiceChannel(workOrderId, kind);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Push failed." };
  }
}

export async function getIntegrationStatus() {
  return {
    serviceChannel: serviceChannelConfigured(),
    outlook: outlookConfigured(),
    webhookSecret: intakeWebhookSecret(),
  };
}
