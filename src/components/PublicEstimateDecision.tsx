"use client";

import { useState } from "react";
import { recordPublicEstimateDecision } from "@/lib/actions/estimates";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

export function PublicEstimateDecision({ token }: { token: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "declined", form: HTMLFormElement) {
    setPending(true);
    setError(null);
    const formData = new FormData(form);
    formData.set("token", token);
    formData.set("decision", decision);
    const result = await recordPublicEstimateDecision(formData);
    setPending(false);
    if (result.ok) setDone(result.message);
    else setError(result.error);
  }

  if (done) {
    return (
      <div className="rounded-card bg-navy-tint px-4 py-3 text-sm text-navy-ink">{done}</div>
    );
  }

  return (
    <form
      className="mt-5 flex flex-col gap-3"
      onSubmit={(e) => e.preventDefault()}
    >
      <div>
        <label className={labelClass} htmlFor="decidedBy">
          Your name
        </label>
        <input
          id="decidedBy"
          name="decidedBy"
          required
          placeholder="Facilities / homeowner name"
          className={inputClass}
        />
      </div>
      {error && (
        <p className="rounded-control bg-critical-tint px-3 py-2.5 text-xs text-critical">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            const form = e.currentTarget.form;
            if (form) void decide("approved", form);
          }}
          className={buttonClass("primary")}
        >
          {pending ? "Saving…" : "Approve estimate"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={(e) => {
            const form = e.currentTarget.form;
            if (form) void decide("declined", form);
          }}
          className={buttonClass("outline")}
        >
          Decline
        </button>
      </div>
    </form>
  );
}
