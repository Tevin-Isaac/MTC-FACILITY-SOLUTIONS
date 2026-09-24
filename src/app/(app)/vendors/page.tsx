import { Wrench, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { mockVendors, vendorComplianceStatus } from "@/lib/mock-data";

export default function VendorsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Vendors</h1>
        <p className="mt-1 text-sm text-muted">
          Trade partners, coverage, and compliance status.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Vendor</th>
                <th className="px-5 py-3 font-medium">Trades</th>
                <th className="px-5 py-3 font-medium">Rate</th>
                <th className="px-5 py-3 font-medium">COI Expires</th>
                <th className="px-5 py-3 font-medium">License Expires</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockVendors.map((vendor) => {
                const status = vendorComplianceStatus(vendor);
                const dateClass =
                  status === "expired"
                    ? "text-status-critical"
                    : status === "expiring_soon"
                      ? "text-amber-700"
                      : undefined;
                return (
                  <tr
                    key={vendor.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Wrench className="h-4 w-4 text-muted" />
                        {vendor.name}
                        {vendor.isLastResort && (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                            Last Resort
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 capitalize">
                      {vendor.trades.map((t) => t.replace(/_/g, " ")).join(", ")}
                    </td>
                    <td className="px-5 py-3">
                      {vendor.rateCardHourly != null
                        ? `$${vendor.rateCardHourly}/hr`
                        : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={dateClass}>{vendor.coiExpiresAt ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={dateClass}>{vendor.licenseExpiresAt ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3">
                      {status === "expired" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-status-critical">
                          <ShieldX className="h-3.5 w-3.5" />
                          Expired — dispatch blocked
                        </span>
                      ) : status === "expiring_soon" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          Expiring soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Compliant
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
