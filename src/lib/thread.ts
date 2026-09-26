export type ThreadChannel = "note" | "call" | "email" | "sms" | "visit";
export type ThreadAudience = "internal" | "client" | "vendor";
export type ThreadOutcome = "logged" | "connected" | "voicemail" | "no_answer" | "sent";

export type ThreadItem = {
  id: string;
  body: string;
  visibility: "internal" | "client";
  authorName: string | null;
  createdAt: string;
  channel: ThreadChannel;
  audience: ThreadAudience;
  contactName: string | null;
  contactValue: string | null;
  outcome: ThreadOutcome | null;
};

const CHANNELS: ThreadChannel[] = ["note", "call", "email", "sms", "visit"];

function asChannel(value: unknown): ThreadChannel {
  return CHANNELS.includes(value as ThreadChannel) ? (value as ThreadChannel) : "note";
}

export function normalizeThreadItem(raw: unknown): ThreadItem | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const body = String(row.body ?? "").trim();
  if (!body) return null;
  const visibility = row.visibility === "client" ? "client" : "internal";
  return {
    id: String(row.id ?? crypto.randomUUID()),
    body,
    visibility,
    authorName: row.authorName != null ? String(row.authorName) : null,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    channel: asChannel(row.channel),
    audience:
      row.audience === "client" || row.audience === "vendor" || row.audience === "internal"
        ? row.audience
        : visibility === "client"
          ? "client"
          : "internal",
    contactName: row.contactName != null ? String(row.contactName) : null,
    contactValue: row.contactValue != null ? String(row.contactValue) : null,
    outcome:
      row.outcome === "connected" ||
      row.outcome === "voicemail" ||
      row.outcome === "no_answer" ||
      row.outcome === "sent" ||
      row.outcome === "logged"
        ? row.outcome
        : null,
  };
}

export function parseThread(raw: string | null): ThreadItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { notes?: unknown[] };
    if (!Array.isArray(parsed.notes)) {
      return [
        {
          id: "legacy",
          body: raw,
          visibility: "internal",
          authorName: null,
          createdAt: new Date(0).toISOString(),
          channel: "note",
          audience: "internal",
          contactName: null,
          contactValue: null,
          outcome: null,
        },
      ];
    }
    return parsed.notes.map(normalizeThreadItem).filter((item): item is ThreadItem => item != null);
  } catch {
    return [
      {
        id: "legacy",
        body: raw,
        visibility: "internal",
        authorName: null,
        createdAt: new Date(0).toISOString(),
        channel: "note",
        audience: "internal",
        contactName: null,
        contactValue: null,
        outcome: null,
      },
    ];
  }
}

export function serializeThread(items: ThreadItem[]): string {
  return JSON.stringify({ notes: items });
}
