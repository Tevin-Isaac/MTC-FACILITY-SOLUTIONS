import { NextResponse } from "next/server";
import { webhookAuthorized } from "@/lib/integrations/config";
import {
  parseIntakeText,
  parseServiceChannelWorkOrder,
  parseServiceChannelXml,
} from "@/lib/integrations/parse-intake";
import { upsertIntakeWorkOrder } from "@/lib/integrations/upsert-work-order";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!webhookAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  const raw = await request.text();
  try {
    let result;
    if (contentType.includes("xml") || raw.trim().startsWith("<")) {
      result = await upsertIntakeWorkOrder(parseServiceChannelXml(raw), "ServiceChannel");
    } else {
      const json = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const payload = (json.WorkOrder ?? json.workOrder ?? json.data ?? json) as Record<string, unknown>;
      const draft = payload.Id || payload.id || payload.Number
        ? parseServiceChannelWorkOrder(payload)
        : parseIntakeText(JSON.stringify(payload));
      result = await upsertIntakeWorkOrder(draft, "ServiceChannel");
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not ingest that work order." },
      { status: 400 }
    );
  }
}
