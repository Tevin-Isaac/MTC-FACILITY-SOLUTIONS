"use client";

import { useMemo, useState } from "react";
import { Phone, Mail, MessageSquare, Lock, Eye, StickyNote, PhoneCall, Send } from "lucide-react";
import type { ThreadItem, ThreadChannel, ThreadOutcome } from "@/lib/thread";
import { addNote } from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import { Tile, SectionHead, Pill, Empty, buttonClass, inputClass } from "@/components/ui";

const TEMPLATES = [
  "Tech is 20 minutes out.",
  "Need access / gate code to proceed.",
  "Work is complete — delivery packet on the way.",
  "Estimate is with you — reply approve or decline.",
  "Following up. Need a yes/no today to hold the slot.",
];

type Filter = "all" | ThreadChannel;

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ChannelIcon({ channel }: { channel: ThreadChannel }) {
  if (channel === "call") return <PhoneCall className="h-3.5 w-3.5" />;
  if (channel === "email") return <Mail className="h-3.5 w-3.5" />;
  if (channel === "sms") return <MessageSquare className="h-3.5 w-3.5" />;
  return <StickyNote className="h-3.5 w-3.5" />;
}

function channelLabel(channel: ThreadChannel) {
  if (channel === "sms") return "Text";
  if (channel === "visit") return "Dispatch";
  return channel[0].toUpperCase() + channel.slice(1);
}

export function ContactChip({
  workOrderId,
  name,
  phone,
  email,
  audience,
}: {
  workOrderId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  audience: "client" | "vendor" | "internal";
}) {
  const { pending, submit } = useAction();

  function log(channel: ThreadChannel, contactValue: string, body: string) {
    const form = new FormData();
    form.set("workOrderId", workOrderId);
    form.set("channel", channel);
    form.set("body", body);
    form.set("visibility", audience === "client" ? "client" : "internal");
    form.set("audience", audience);
    form.set("contactName", name);
    form.set("contactValue", contactValue);
    form.set("outcome", channel === "call" ? "logged" : "sent");
    submit(addNote, form);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={() => log("call", phone, `Called ${name} at ${phone}`)}
          className={buttonClass("soft", "text-xs")}
        >
          <Phone className="h-3.5 w-3.5" />
          Call
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          onClick={() => log("email", email, `Emailed ${name} at ${email}`)}
          className={buttonClass("soft", "text-xs")}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </a>
      )}
      {phone && (
        <a
          href={`sms:${phone}`}
          onClick={() => log("sms", phone, `Texted ${name} at ${phone}`)}
          className={buttonClass("soft", "text-xs")}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Text
        </a>
      )}
      {pending && <span className="text-[11px] text-ink-3">Logging…</span>}
    </div>
  );
}

export function WorkOrderThread({
  workOrderId,
  notes,
  siteName,
  sitePhone,
  siteEmail,
  vendorName,
  vendorPhone,
  vendorEmail,
  reporterName,
  reporterPhone,
}: {
  workOrderId: string;
  notes: ThreadItem[];
  siteName: string | null;
  sitePhone: string | null;
  siteEmail: string | null;
  vendorName: string | null;
  vendorPhone: string | null;
  vendorEmail: string | null;
  reporterName: string | null;
  reporterPhone: string | null;
}) {
  const { pending, submit } = useAction();
  const [filter, setFilter] = useState<Filter>("all");
  const [channel, setChannel] = useState<ThreadChannel>("note");
  const [outcome, setOutcome] = useState<ThreadOutcome>("connected");
  const [body, setBody] = useState("");

  const visible = useMemo(
    () => (filter === "all" ? notes : notes.filter((item) => item.channel === filter)),
    [filter, notes]
  );

  function send(form: HTMLFormElement) {
    submit(addNote, new FormData(form), () => {
      setBody("");
      form.reset();
    });
  }

  return (
    <Tile>
      <SectionHead
        title="Notes & communications"
        sub="Every call, text, email and note on this job — logged the moment you reach out."
        trailing={<Pill tone="neutral">{notes.length}</Pill>}
      />

      <div className="mt-4 flex flex-col gap-3 rounded-card bg-sunken p-3.5">
        <p className="text-[11px] font-medium text-ink-3">One-tap reach · each tap is written to the thread</p>
        {siteName && (sitePhone || siteEmail) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink-2">Site · {siteName}</span>
            <ContactChip
              workOrderId={workOrderId}
              name={siteName}
              phone={sitePhone}
              email={siteEmail}
              audience="client"
            />
          </div>
        )}
        {vendorName && (vendorPhone || vendorEmail) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink-2">Vendor · {vendorName}</span>
            <ContactChip
              workOrderId={workOrderId}
              name={vendorName}
              phone={vendorPhone}
              email={vendorEmail}
              audience="vendor"
            />
          </div>
        )}
        {reporterName && reporterPhone && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-ink-2">Reporter · {reporterName} · never shown to vendors</span>
            <ContactChip
              workOrderId={workOrderId}
              name={reporterName}
              phone={reporterPhone}
              audience="internal"
            />
          </div>
        )}
      </div>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(e.currentTarget);
        }}
      >
        <input type="hidden" name="workOrderId" value={workOrderId} />
        <input type="hidden" name="channel" value={channel} />
        {channel !== "note" && <input type="hidden" name="audience" value="client" />}
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              ["note", "Note"],
              ["call", "Call"],
              ["email", "Email"],
              ["sms", "Text"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setChannel(value)}
              className={`rounded-control px-2 py-2 text-xs font-medium ${
                channel === value ? "bg-navy text-white" : "bg-sunken text-ink-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {channel === "call" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(
              [
                ["connected", "Connected"],
                ["voicemail", "Voicemail"],
                ["no_answer", "No answer"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setOutcome(value)}
                className={`rounded-control px-2.5 py-1.5 text-[11px] font-medium ${
                  outcome === value ? "bg-navy text-white" : "bg-sunken text-ink-2"
                }`}
              >
                {label}
              </button>
            ))}
            <input type="hidden" name="outcome" value={outcome} />
          </div>
        )}

        <textarea
          name="body"
          required
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            channel === "call"
              ? "What was said, who you spoke with…"
              : channel === "email"
                ? "What you emailed…"
                : channel === "sms"
                  ? "What you texted…"
                  : "Called the store, tech is 20 minutes out…"
          }
          className={`${inputClass} mt-2 resize-y`}
        />

        {channel === "note" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TEMPLATES.map((line) => (
              <button
                key={line}
                type="button"
                onClick={() => setBody(line)}
                className="rounded-control bg-sunken px-2.5 py-1 text-[11px] text-ink-2 hover:bg-tint"
              >
                {line}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          {channel === "note" ? (
            <select name="visibility" className={`${inputClass} w-auto py-1.5`} defaultValue="internal">
              <option value="internal">Internal only</option>
              <option value="client">Client visible</option>
            </select>
          ) : (
            <input type="hidden" name="visibility" value={channel === "call" ? "internal" : "client"} />
          )}
          <button type="submit" disabled={pending} className={buttonClass("soft")}>
            <Send className="h-3.5 w-3.5" />
            {pending ? "Saving…" : channel === "note" ? "Add note" : `Log ${channelLabel(channel).toLowerCase()}`}
          </button>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(
          [
            ["all", "All"],
            ["note", "Notes"],
            ["call", "Calls"],
            ["email", "Email"],
            ["sms", "Texts"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-control px-2.5 py-1 text-[11px] font-medium ${
              filter === value ? "bg-navy text-white" : "bg-sunken text-ink-2"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Empty title="Nothing in this thread yet" hint="Log a call or add the first note — it stays with the job." />
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {visible.map((item) => (
            <li key={item.id} className="rounded-card bg-sunken p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={item.channel === "call" ? "gold" : item.visibility === "client" ? "navy" : "neutral"}>
                  <ChannelIcon channel={item.channel} />
                  {channelLabel(item.channel)}
                  {item.outcome ? ` · ${item.outcome.replace(/_/g, " ")}` : ""}
                </Pill>
                {item.visibility === "client" ? (
                  <Pill tone="navy">
                    <Eye className="h-3 w-3" />
                    Client
                  </Pill>
                ) : (
                  <Pill tone="neutral">
                    <Lock className="h-3 w-3" />
                    Internal
                  </Pill>
                )}
                <span className="ml-auto text-[11px] text-ink-3">
                  {item.authorName ?? "Unknown"} · {formatWhen(item.createdAt)}
                </span>
              </div>
              {item.contactName && (
                <p className="mt-1.5 text-[11px] text-ink-3">
                  {item.contactName}
                  {item.contactValue ? ` · ${item.contactValue}` : ""}
                </p>
              )}
              <p className="mt-2 text-sm whitespace-pre-wrap">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}
