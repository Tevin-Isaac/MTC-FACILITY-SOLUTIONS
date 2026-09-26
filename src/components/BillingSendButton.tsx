"use client";

import { useState } from "react";
import { Copy, Check, Send } from "lucide-react";
import { submitInvoiceToClient } from "@/lib/actions/estimates";
import { useAction } from "@/components/useAction";
import { buttonClass } from "@/components/ui";

export function BillingSendButton({
  workOrderId,
  amount,
}: {
  workOrderId: string;
  amount: number;
}) {
  const { pending, submit } = useAction();
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function shareUrl(path: string) {
    return `${window.location.origin}${path}`;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const form = new FormData();
          form.set("workOrderId", workOrderId);
          form.set("amount", String(amount));
          submit(submitInvoiceToClient, form, (result) => {
            if (result.sharePath) setSharePath(result.sharePath);
          });
        }}
        className={buttonClass("gold", "text-xs")}
      >
        <Send className="h-3.5 w-3.5" />
        {pending ? "Sending…" : "Send invoice"}
      </button>
      {sharePath && (
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl(sharePath));
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              setCopied(false);
            }
          }}
          className={buttonClass("soft", "text-xs")}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy client link"}
        </button>
      )}
    </div>
  );
}
