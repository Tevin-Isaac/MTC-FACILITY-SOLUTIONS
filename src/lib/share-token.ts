import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "mtc-local-share"
  );
}

export type ShareKind = "e" | "i" | "d";

export function makeShareToken(kind: ShareKind, workOrderId: string): string {
  const payload = Buffer.from(`${kind}.${workOrderId}`).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 18);
  return `${payload}.${sig}`;
}

export function readShareToken(token: string): { kind: ShareKind; workOrderId: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 18);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  const [kind, workOrderId] = decoded.split(".");
  if ((kind !== "e" && kind !== "i" && kind !== "d") || !workOrderId) return null;
  return { kind, workOrderId };
}
