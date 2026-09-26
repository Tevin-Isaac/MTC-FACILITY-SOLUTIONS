import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/integrations/config";
import { pullInboundWork } from "@/lib/integrations/sync";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const summary = await pullInboundWork();
  return NextResponse.json({ ok: true, summary });
}

export async function GET(request: Request) {
  return POST(request);
}
