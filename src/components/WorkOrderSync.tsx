"use client";

import { Radio } from "lucide-react";
import { pushWorkOrderNow } from "@/lib/actions/integrations";
import { useAction } from "@/components/useAction";
import { Tile, SectionHead, Pill, buttonClass } from "@/components/ui";

export function WorkOrderSync({
  workOrderId,
  trackingNumber,
  source,
}: {
  workOrderId: string;
  trackingNumber: string | null;
  source: string;
}) {
  const { pending, submitFields } = useAction();
  const linked = Boolean(trackingNumber);

  return (
    <Tile>
      <SectionHead
        title="ServiceChannel"
        sub={linked ? `Tracking ${trackingNumber}` : "No external tracking number yet"}
        trailing={<Pill tone={linked ? "navy" : "neutral"}>{source.replace(/_/g, " ")}</Pill>}
      />
      {linked ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => submitFields(pushWorkOrderNow, { workOrderId, kind: "status" })}
            className={buttonClass("soft", "text-xs")}
          >
            <Radio className="h-3.5 w-3.5" />
            {pending ? "Pushing…" : "Push status"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submitFields(pushWorkOrderNow, { workOrderId, kind: "delivery" })}
            className={buttonClass("soft", "text-xs")}
          >
            Push delivery packet
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-ink-3">
          Import from Intake or ServiceChannel to attach a tracking number. Then status, notes, and photos can push back.
        </p>
      )}
    </Tile>
  );
}
