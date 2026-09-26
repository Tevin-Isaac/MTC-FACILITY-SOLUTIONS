import "server-only";
import { outlookConfigured, outlookEnv } from "@/lib/integrations/config";

type Token = { accessToken: string; expiresAt: number };
let cached: Token | null = null;

async function graphToken(): Promise<string> {
  if (!outlookConfigured()) {
    throw new Error("Outlook / Microsoft Graph credentials are not configured.");
  }
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.accessToken;
  const env = outlookEnv();
  const response = await fetch(`https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const json = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || `Outlook login failed (${response.status}).`);
  }
  cached = {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 1800) * 1000,
  };
  return cached.accessToken;
}

export type OutlookMessage = {
  id: string;
  subject: string;
  body: string;
  from: string | null;
  receivedAt: string | null;
};

export async function listUnreadIntakeMail(): Promise<OutlookMessage[]> {
  const env = outlookEnv();
  const token = await graphToken();
  const mailbox = encodeURIComponent(env.mailbox);
  const filter = encodeURIComponent("isRead eq false");
  const select = encodeURIComponent("id,subject,body,from,receivedDateTime");
  const url = `https://graph.microsoft.com/v1.0/users/${mailbox}/messages?$filter=${filter}&$select=${select}&$top=25`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await response.json()) as {
    value?: Array<{
      id: string;
      subject?: string;
      body?: { content?: string };
      from?: { emailAddress?: { address?: string; name?: string } };
      receivedDateTime?: string;
    }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(json.error?.message || `Outlook mail pull failed (${response.status}).`);
  }
  return (json.value ?? []).map((row) => ({
    id: row.id,
    subject: row.subject ?? "(no subject)",
    body: stripHtml(row.body?.content ?? ""),
    from: row.from?.emailAddress?.address ?? row.from?.emailAddress?.name ?? null,
    receivedAt: row.receivedDateTime ?? null,
  }));
}

export async function markOutlookRead(id: string) {
  const env = outlookEnv();
  const token = await graphToken();
  await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(env.mailbox)}/messages/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isRead: true }),
    }
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
