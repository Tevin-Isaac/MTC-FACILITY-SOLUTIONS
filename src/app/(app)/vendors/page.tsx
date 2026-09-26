import { Wrench, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { vendorComplianceStatus } from "@/lib/domain";
import { getAppData } from "@/lib/data/queries";
import { TERMINAL_STATUSES } from "@/types/work-order";
import { Tile, Pill, Empty, SectionHead } from "@/components/ui";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function VendorsPage() {
  const { vendors, workOrders } = await getAppData();

  const openByVendor = new Map<string, number>();
  for (const wo of workOrders) {
    if (!wo.vendorId || TERMINAL_STATUSES.includes(wo.status)) continue;
    openByVendor.set(wo.vendorId, (openByVendor.get(wo.vendorId) ?? 0) + 1);
  }

  const expiredCount = vendors.filter(
    (v) => vendorComplianceStatus(v) === "expired"
  ).length;
  const expiringCount = vendors.filter(
    (v) => vendorComplianceStatus(v) === "expiring_soon"
  ).length;

  // Blocked vendors first — an expired vendor still holding live work is the
  // thing a coordinator needs to see on opening this page.
  const sorted = [...vendors].sort((a, b) => {
    const rank = (v: typeof a) => {
      const status = vendorComplianceStatus(v);
      if (status === "expired") return 0;
      if (status === "expiring_soon") return 1;
      return 2;
    };
    return rank(a) - rank(b) || a.name.localeCompare(b.name);
  });

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Vendors</h1>
          <p className="mt-1 text-sm text-ink-2">
            {vendors.length} trade partners · coverage and compliance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {expiredCount > 0 && (
            <Pill tone="critical" dot>
              {expiredCount} blocked
            </Pill>
          )}
          {expiringCount > 0 && (
            <Pill tone="warning" dot>
              {expiringCount} expiring soon
            </Pill>
          )}
          {expiredCount === 0 && expiringCount === 0 && (
            <Pill tone="good" dot>
              All compliant
            </Pill>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <Tile>
          <Empty title="No vendors on file" />
        </Tile>
      ) : (
        <Tile padded={false}>
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <SectionHead
              title="Directory"
              sub="Dispatch is blocked server-side for any vendor with expired documents"
            />
          </div>
          <div className="overflow-x-auto p-2 sm:p-3">
            <table className="w-full min-w-[56rem] border-separate border-spacing-y-1 text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="px-3 pb-1 font-medium">Vendor</th>
                  <th className="px-3 pb-1 font-medium">Trades</th>
                  <th className="px-3 pb-1 font-medium">Rate</th>
                  <th className="px-3 pb-1 font-medium">COI expires</th>
                  <th className="px-3 pb-1 font-medium">License expires</th>
                  <th className="px-3 pb-1 font-medium">Open WOs</th>
                  <th className="px-3 pb-1 font-medium">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((vendor) => {
                  const status = vendorComplianceStatus(vendor);
                  const dateClass =
                    status === "expired"
                      ? "font-medium text-critical"
                      : status === "expiring_soon"
                        ? "font-medium text-warning"
                        : "text-ink-2";
                  const open = openByVendor.get(vendor.id) ?? 0;
                  return (
                    <tr key={vendor.id} className="group">
                      <td className="rounded-l-card bg-sunken px-3 py-3 group-hover:bg-tint">
                        <div className="flex items-center gap-2 font-medium">
                          <Wrench className="h-4 w-4 shrink-0 text-ink-3" />
                          {vendor.name}
                          {!vendor.active && <Pill tone="neutral">Inactive</Pill>}
                          {vendor.isLastResort && <Pill tone="neutral">Last resort</Pill>}
                        </div>
                      </td>
                      <td className="bg-sunken px-3 py-3 capitalize text-ink-2 group-hover:bg-tint">
                        {vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                      </td>
                      <td className="bg-sunken px-3 py-3 tabular-nums text-ink-2 group-hover:bg-tint">
                        {vendor.rateCardHourly != null ? `$${vendor.rateCardHourly}/hr` : "—"}
                      </td>
                      <td className={`bg-sunken px-3 py-3 group-hover:bg-tint ${dateClass}`}>
                        {formatDate(vendor.coiExpiresAt)}
                      </td>
                      <td className={`bg-sunken px-3 py-3 group-hover:bg-tint ${dateClass}`}>
                        {formatDate(vendor.licenseExpiresAt)}
                      </td>
                      <td className="bg-sunken px-3 py-3 group-hover:bg-tint">
                        {open > 0 ? (
                          <span className="font-medium tabular-nums">{open}</span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="rounded-r-card bg-sunken px-3 py-3 group-hover:bg-tint">
                        {status === "expired" ? (
                          <Pill tone="critical">
                            <ShieldX className="h-3.5 w-3.5" />
                            Expired — dispatch blocked
                          </Pill>
                        ) : status === "expiring_soon" ? (
                          <Pill tone="warning">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Expiring soon
                          </Pill>
                        ) : status === "unknown" ? (
                          <Pill tone="neutral">No documents on file</Pill>
                        ) : (
                          <Pill tone="good">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Compliant
                          </Pill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Tile>
      )}
    </div>
  );
}
