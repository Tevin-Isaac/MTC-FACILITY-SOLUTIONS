import { NextResponse } from "next/server";
import { webhookAuthorized } from "@/lib/integrations/config";
import { parseIntakeText } from "@/lib/integrations/parse-intake";
import { upsertIntakeWorkOrder } from "@/lib/integrations/upsert-work-order";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!webhookAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const contentType = request.headers.get("content-type") ?? "";
  try {
    let subject: string | null = null;
    let body = "";
    let from: string | null = null;
    if (contentType.includes("json")) {
      const json = (await request.json()) as Record<string, unknown>;
      subject = String(json.subject ?? json.Subject ?? "").trim() || null;
      body = String(json.body ?? json.Body ?? json.text ?? json.Text ?? "").trim();
      from = String(json.from ?? json.From ?? "").trim() || null;
    } else {
      body = (await request.text()).trim();
    }
    if (body.length < 12) {
      return NextResponse.json({ ok: false, error: "Empty email." }, { status: 400 });
    }
    const result = await upsertIntakeWorkOrder(parseIntakeText(body, subject), from ?? "Outlook");
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not ingest that email." },
      { status: 400 }
    );
  }
}
