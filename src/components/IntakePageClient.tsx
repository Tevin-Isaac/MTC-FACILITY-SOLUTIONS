"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox, RefreshCw, Copy, Check } from "lucide-react";
import { importIntakeEmail, pullIntegrationsNow } from "@/lib/actions/integrations";
import { useAction } from "@/components/useAction";
import { Tile, SectionHead, Pill, buttonClass, inputClass, labelClass } from "@/components/ui";

const SAMPLE = `From: notifications@servicechannel.com
Subject: New Work Order 364382014 — Crash Champions CC549

Work Order #: 364382014
Store ID: CC549
Location: Crash Champions - CC549
Address: 1420 Oak Cliff Ave, Dallas, TX
Trade: HVAC
Priority: P2 - 24 Hours
NTE: 450
Status: OPEN
Description: Ice machine not cooling / Alex Rivera / 214-555-0199
`;

export function IntakePageClient({
  serviceChannel,
  outlook,
  webhookSecret,
  origin,
  isAdmin = false,
}: {
  serviceChannel: boolean;
  outlook: boolean;
  webhookSecret: string;
  origin: string;
  isAdmin?: boolean;
}) {
  const { pending, submit } = useAction();
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  }

  const scUrl = `${origin}/api/integrations/service-channel/webhook`;
  const outlookUrl = `${origin}/api/integrations/outlook/webhook`;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Intake</h1>
        <p className="mt-1 text-sm text-ink-2">
          Paste a ServiceChannel or client email to open a work order. Integration keys live on the admin dashboard.
        </p>
      </div>

      {isAdmin && (
      <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Tile>
          <SectionHead
            title="ServiceChannel"
            trailing={<Pill tone={serviceChannel ? "good" : "warning"}>{serviceChannel ? "API connected" : "Webhook ready"}</Pill>}
          />
          <p className="mt-3 text-sm text-ink-2">
            {serviceChannel
              ? "Pull open work orders and push status, notes, and delivery photos back."
              : "Point ServiceChannel outgoing XML/API at the webhook. Add API credentials in .env.local to enable two-way pull/push."}
          </p>
          <p className="mt-3 break-all text-xs text-ink-3">{scUrl}</p>
        </Tile>
        <Tile>
          <SectionHead
            title="Outlook"
            trailing={<Pill tone={outlook ? "good" : "warning"}>{outlook ? "Mailbox connected" : "Forward ready"}</Pill>}
          />
          <p className="mt-3 text-sm text-ink-2">
            {outlook
              ? "Unread intake mail is pulled on sync and turned into work orders."
              : "Create an Outlook rule or Power Automate flow that POSTs new mail to the webhook, or paste the email below."}
          </p>
          <p className="mt-3 break-all text-xs text-ink-3">{outlookUrl}</p>
        </Tile>
      </div>

      <Tile>
        <SectionHead title="Webhook header" sub="x-mtc-intake — same secret for both URLs" />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => copy("secret", webhookSecret)} className={buttonClass("soft", "text-xs")}>
            {copied === "secret" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied === "secret" ? "Copied" : "Copy secret"}
          </button>
          <button type="button" onClick={() => copy("sc", scUrl)} className={buttonClass("ghost", "text-xs")}>
            Copy ServiceChannel URL
          </button>
          <button type="button" onClick={() => copy("ol", outlookUrl)} className={buttonClass("ghost", "text-xs")}>
            Copy Outlook URL
          </button>
        </div>
      </Tile>

      </>
      )}

      {isAdmin && (
      <Tile>
        <SectionHead title="Pull now" sub="Reads ServiceChannel open work and unread Outlook mail." />
        <button
          type="button"
          disabled={pending}
          onClick={() => submit(pullIntegrationsNow, new FormData())}
          className={`${buttonClass("primary")} mt-4`}
        >
          <RefreshCw className="h-4 w-4" />
          {pending ? "Pulling…" : "Pull ServiceChannel + Outlook"}
        </button>
      </Tile>
      )}

      <Tile>
        <SectionHead
          title="Paste an email"
          sub="ServiceChannel notices and client emails become work orders immediately."
        />
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit(importIntakeEmail, new FormData(event.currentTarget), (result) => {
              if ("workOrderId" in result && result.workOrderId) {
                router.push(`/work-orders/${result.workOrderId}`);
              }
            });
          }}
        >
          <div>
            <label className={labelClass} htmlFor="subject">
              Subject
            </label>
            <input id="subject" name="subject" placeholder="New Work Order 364382014" className={inputClass} />
          </div>
          <div>
            <label className={labelClass} htmlFor="emailBody">
              Email body
            </label>
            <textarea
              id="emailBody"
              name="emailBody"
              required
              rows={12}
              defaultValue={SAMPLE}
              className={`${inputClass} resize-y font-mono text-xs`}
            />
          </div>
          <button type="submit" disabled={pending} className={buttonClass("primary")}>
            <Inbox className="h-4 w-4" />
            {pending ? "Importing…" : "Create work order from email"}
          </button>
        </form>
      </Tile>
    </div>
  );
}
