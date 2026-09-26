"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/work-orders";

type Action = (formData: FormData) => Promise<ActionResult>;

/**
 * Runs a server action inside a transition and reports the outcome as a
 * toast. Every write in the app goes through this so success and failure
 * feedback is consistent, and so the caller gets a `pending` flag for
 * disabling its own controls.
 */
export function useAction() {
  const [pending, startTransition] = useTransition();

  function submit(action: Action, formData: FormData, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  /** Convenience for actions whose only input is the work order id. */
  function submitFields(
    action: Action,
    fields: Record<string, string>,
    onSuccess?: () => void
  ) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }
    submit(action, formData, onSuccess);
  }

  return { pending, submit, submitFields };
}
