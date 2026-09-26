import "server-only";
import { serviceChannelConfigured, serviceChannelEnv } from "@/lib/integrations/config";

type Token = { accessToken: string; expiresAt: number };
let cached: Token | null = null;

async function token(): Promise<string> {
  if (!serviceChannelConfigured()) {
    throw new Error("ServiceChannel credentials are not configured.");
  }
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.accessToken;
  const env = serviceChannelEnv();
  const basic = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "password",
    username: env.username,
    password: env.password,
  });
  const response = await fetch(env.loginUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error || `ServiceChannel login failed (${response.status}).`);
  }
  cached = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 1800) * 1000,
  };
  return cached.accessToken;
}

async function scFetch(path: string, init: RequestInit = {}) {
  const env = serviceChannelEnv();
  const access = await token();
  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${access}`,
      Accept: "application/json",
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`ServiceChannel ${path} failed (${response.status}): ${text.slice(0, 240)}`);
  }
  return json;
}

export async function listOpenServiceChannelWorkOrders(): Promise<Record<string, unknown>[]> {
  const tried = [
    "/v3/workorders?status=OPEN&status=INPROGRESS&status=IN%20PROGRESS",
    "/v3/odata/workorders?$filter=Status/Primary ne 'COMPLETED' and Status/Primary ne 'CANCELED'&$top=100",
  ];
  for (const path of tried) {
    try {
      const json = await scFetch(path);
      if (Array.isArray(json)) return json as Record<string, unknown>[];
      const record = json as Record<string, unknown>;
      if (Array.isArray(record.value)) return record.value as Record<string, unknown>[];
      if (Array.isArray(record.WorkOrders)) return record.WorkOrders as Record<string, unknown>[];
    } catch {
      continue;
    }
  }
  throw new Error("Could not list ServiceChannel work orders.");
}

export async function getServiceChannelWorkOrder(id: string): Promise<Record<string, unknown>> {
  return (await scFetch(`/v3/workorders/${id}`)) as Record<string, unknown>;
}

export async function postServiceChannelNote(id: string, note: string) {
  return scFetch(`/v3/workorders/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ Note: note, Actor: "Provider" }),
  });
}

export async function updateServiceChannelStatus(
  id: string,
  primary: string,
  extended?: string | null
) {
  const payload = { Status: { Primary: primary, Extended: extended ?? "" } };
  try {
    return await scFetch(`/v3/workorders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } catch {
    return scFetch(`/v3/workorders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
}

export async function postServiceChannelAttachment(
  id: string,
  fileName: string,
  bytes: Uint8Array,
  contentType: string
) {
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart], { type: contentType }), fileName);
  return scFetch(`/v3/workorders/${id}/attachments`, { method: "POST", body: form });
}
