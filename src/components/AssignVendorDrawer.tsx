"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Star,
  UserRoundCog,
  Phone,
  Mail,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import type { Trade, Vendor } from "@/types/work-order";
import { vendorComplianceStatus } from "@/lib/domain";
import { useAppData } from "@/components/AppDataProvider";
import { dispatchWorkOrder } from "@/lib/actions/work-orders";
import { useAction } from "@/components/useAction";
import { Drawer, DrawerItem } from "@/components/Drawer";
import { Pill, buttonClass, inputClass, FormField } from "@/components/ui";

function defaultArrivalLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildPacket(input: {
  woNumber?: string;
  vendor: Vendor;
  scheduledAt: string;
  note: string;
  siteName?: string;
  address?: string;
  description?: string;
}) {
  const when = new Date(input.scheduledAt);
  const scheduledLabel = Number.isNaN(when.getTime())
    ? input.scheduledAt
    : when.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
  return [
    input.woNumber ? `${input.woNumber} dispatched to ${input.vendor.name}` : `Dispatch to ${input.vendor.name}`,
    `Arrive: ${scheduledLabel}`,
    input.siteName ? `Site: ${input.siteName}` : null,
    input.address ? `Address: ${input.address}` : null,
    input.description ? `Scope: ${input.description}` : null,
    input.note ? `Notes: ${input.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function AssignVendorDrawer({
  workOrderId,
  trade,
  currentVendorId,
  variant = "soft",
  woNumber,
  description,
}: {
  workOrderId: string;
  trade: Trade;
  currentVendorId: string | null;
  variant?: "soft" | "primary";
  woNumber?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Vendor | null>(null);
  const [scheduledAt, setScheduledAt] = useState(defaultArrivalLocal);
  const [note, setNote] = useState("");
  const [notifyBy, setNotifyBy] = useState<"phone" | "email" | "in_app">("phone");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { vendorsForTrade, siteById, accountForSite, workOrders } = useAppData();
  const { pending, submit } = useAction();

  const vendors = vendorsForTrade(trade);
  const wo = workOrders.find((item) => item.id === workOrderId);
  const site = wo ? siteById(wo.siteId) : undefined;
  const account = wo ? accountForSite(wo.siteId) : undefined;

  const packet = useMemo(() => {
    if (!picked) return "";
    return buildPacket({
      woNumber: woNumber ?? wo?.woNumber,
      vendor: picked,
      scheduledAt,
      note,
      siteName: site?.name,
      address: site?.address,
      description: description ?? wo?.description,
    });
  }, [picked, scheduledAt, note, woNumber, wo, site, description]);

  function reset() {
    setPicked(null);
    setScheduledAt(defaultArrivalLocal());
    setNote("");
    setNotifyBy("phone");
    setCopied(false);
    setSent(false);
  }

  function close() {
    const wasSent = sent;
    setOpen(false);
    reset();
    if (wasSent) router.refresh();
  }

  function send() {
    if (!picked) return;
    const form = new FormData();
    form.set("workOrderId", workOrderId);
    form.set("vendorId", picked.id);
    form.set("scheduledAt", scheduledAt);
    form.set("note", note);
    form.set("notifyBy", notifyBy);
    submit(dispatchWorkOrder, form, () => setSent(true));
  }

  async function copyPacket() {
    try {
      await navigator.clipboard.writeText(packet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass(variant, "px-3 py-2 text-xs")}
      >
        <UserRoundCog className="h-3.5 w-3.5" />
        {currentVendorId ? "Redispatch" : "Dispatch"}
      </button>

      <Drawer
        open={open}
        onClose={close}
        title={sent ? "Dispatch sent" : picked ? "Confirm dispatch" : "Dispatch a vendor"}
        sub={
          sent
            ? `${picked?.name} is on the job`
            : picked
              ? `${account?.type === "residential" ? "Residential" : "Corporate"} · ${trade.replace(/_/g, " ")}`
              : `Ranked for ${trade.replace(/_/g, " ")} · ${vendors.length} available`
        }
        footer={
          picked && !sent ? (
            <button
              type="button"
              disabled={pending}
              onClick={send}
              className={buttonClass("primary", "w-full py-3")}
            >
              {pending ? "Sending dispatch…" : "Send dispatch"}
            </button>
          ) : undefined
        }
      >
        {sent && picked ? (
          <div className="space-y-4">
            <div className="rounded-card bg-good-tint px-4 py-3 text-sm text-good">
              {woNumber ?? wo?.woNumber ?? "Work order"} is assigned to {picked.name}.
            </div>
            <pre className="whitespace-pre-wrap rounded-card bg-sunken px-4 py-3 text-xs leading-relaxed text-ink-2">
              {packet}
            </pre>
            <div className="flex flex-col gap-2">
              {picked.phone && (
                <a href={`tel:${picked.phone}`} className={buttonClass("primary", "w-full")}>
                  <Phone className="h-4 w-4" />
                  Call {picked.phone}
                </a>
              )}
              {picked.email && (
                <a
                  href={`mailto:${picked.email}?subject=${encodeURIComponent(
                    `Dispatch ${woNumber ?? wo?.woNumber ?? ""}`
                  )}&body=${encodeURIComponent(packet)}`}
                  className={buttonClass("soft", "w-full")}
                >
                  <Mail className="h-4 w-4" />
                  Email {picked.email}
                </a>
              )}
              <button type="button" onClick={copyPacket} className={buttonClass("outline", "w-full")}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy dispatch details"}
              </button>
            </div>
          </div>
        ) : picked ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Choose a different vendor
            </button>
            <div className="rounded-card bg-sunken p-4">
              <p className="text-[15px] font-semibold">{picked.name}</p>
              <p className="mt-1 text-xs text-ink-3">
                {[picked.phone, picked.email].filter(Boolean).join(" · ") || "No contact on file"}
              </p>
            </div>
            <FormField label="Arrive by" htmlFor="scheduledAt">
              <input
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={inputClass}
              />
            </FormField>
            <FormField
              label="Dispatch notes"
              htmlFor="dispatchNote"
              hint="Gate codes, homeowner name, parking — whatever the tech needs on arrival."
            >
              <textarea
                id="dispatchNote"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${inputClass} resize-y`}
                placeholder="Homeowner will be on site. Dogs in backyard."
              />
            </FormField>
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-2">How you'll notify them</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ["phone", "Call"],
                    ["email", "Email"],
                    ["in_app", "Log only"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNotifyBy(value)}
                    className={`rounded-control px-2 py-2 text-xs font-medium ${
                      notifyBy === value ? "bg-navy text-white" : "bg-sunken text-ink-2 hover:bg-tint"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          vendors.map((vendor, i) => {
            const tradeMatch = vendor.trades.includes(trade);
            const compliance = vendorComplianceStatus(vendor);
            const isCurrent = vendor.id === currentVendorId;
            const blocked = compliance === "expired";
            return (
              <DrawerItem key={vendor.id} index={i} className="mb-2.5">
                <div
                  className={`rounded-card p-4 transition-colors ${
                    isCurrent ? "bg-gold-tint" : "bg-sunken hover:bg-tint"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold">{vendor.name}</p>
                      <p className="truncate text-xs capitalize text-ink-3">
                        {vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                      </p>
                    </div>
                    {!tradeMatch && <Pill tone="neutral">No trade match</Pill>}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                    {vendor.rateCardHourly != null && (
                      <span className="font-medium tabular-nums text-ink-2">
                        ${vendor.rateCardHourly}/hr
                      </span>
                    )}
                    {compliance === "expired" ? (
                      <span className="inline-flex items-center gap-1 font-medium text-critical">
                        <ShieldX className="h-3.5 w-3.5" />
                        COI/license expired
                      </span>
                    ) : compliance === "expiring_soon" ? (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        COI expiring soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-good">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Compliance valid
                      </span>
                    )}
                    {vendor.isLastResort && (
                      <span className="inline-flex items-center gap-1 text-ink-3">
                        <Star className="h-3.5 w-3.5" />
                        Last resort
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => setPicked(vendor)}
                    className={buttonClass("primary", "mt-3.5 w-full py-2.5 text-xs")}
                  >
                    {blocked
                      ? "Dispatch blocked — compliance expired"
                      : isCurrent
                        ? "Redispatch this vendor"
                        : "Select & continue"}
                  </button>
                </div>
              </DrawerItem>
            );
          })
        )}
      </Drawer>
    </>
  );
}
