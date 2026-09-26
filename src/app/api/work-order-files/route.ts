import { NextResponse } from "next/server";
import { removeCompletionFile, uploadCompletionFiles } from "@/lib/actions/files";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "upload");
  const result = intent === "remove" ? await removeCompletionFile(form) : await uploadCompletionFiles(form);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
