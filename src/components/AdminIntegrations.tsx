"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw } from "lucide-react";
import { pullIntegrationsNow } from "@/lib/actions/integrations";
import { useAction } from "@/components/useAction";
import { Tile, SectionHead, Pill, buttonClass } from "@/components/ui";

export function AdminIntegrations({
  serviceChannel,
  outlook,
  webhookSecret,
  origin,
}: {
  serviceChannel: boolean;
  outlook: boolean;
  webhookSecret: string;
  origin: string;
}) {
  const { pending, submit } = useAction();
  const [copied, setCopied] = useState<string | null>(null);
  const scUrl = `${origin}/api/integrations/service-channel/webhook`;
  const outlookUrl = `${origin}/api/integrations/outlook/webhook`;

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <Tile>
      <SectionHead
        title="Integrations"
        sub="ServiceChannel and Outlook — only owners and admins change these."
        trailing={
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(pullIntegrationsNow, new FormData())}
            className={buttonClass("soft", "text-xs")}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {pending ? "Pulling…" : "Pull now"}
          </button>
        }
      />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-card bg-sunken px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">ServiceChannel</p>
            <Pill tone={serviceChannel ? "good" : "warning"}>
              {serviceChannel ? "API connected" : "Webhook only"}
            </Pill>
          </div>
          <p className="mt-2 break-all text-xs text-ink-3">{scUrl}</p>
        </div>
        <div className="rounded-card bg-sunken px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Outlook</p>
            <Pill tone={outlook ? "good" : "warning"}>{outlook ? "Mailbox connected" : "Forward only"}</Pill>
          </div>
          <p className="mt-2 break-all text-xs text-ink-3">{outlookUrl}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => copy("secret", webhookSecret)} className={buttonClass("ghost", "text-xs")}>
          {copied === "secret" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === "secret" ? "Copied secret" : "Copy webhook secret"}
        </button>
        <button type="button" onClick={() => copy("sc", scUrl)} className={buttonClass("ghost", "text-xs")}>
          Copy ServiceChannel URL
        </button>
        <button type="button" onClick={() => copy("ol", outlookUrl)} className={buttonClass("ghost", "text-xs")}>
          Copy Outlook URL
        </button>
      </div>
    </Tile>
  );
}
