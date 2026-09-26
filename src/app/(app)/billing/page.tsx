import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getAppData, getInvoices } from "@/lib/data/queries";
import { makeShareToken } from "@/lib/share-token";
import { Tile, SectionHead, Pill, Money, Empty } from "@/components/ui";
import { StatusBadge } from "@/components/Badge";
import { BillingSendButton } from "@/components/BillingSendButton";

export default async function BillingPage() {
  await requireAdmin();
  const [{ workOrders, sites }, invoices] = await Promise.all([getAppData(), getInvoices()]);
  const ready = workOrders.filter((wo) =>
    ["ready_to_bill", "ready_to_invoice"].includes(wo.status)
  );
  const readyValue = ready.reduce((sum, wo) => sum + (wo.dne ?? wo.nte ?? 0), 0);
  const openAr = invoices
    .filter((inv) => !["paid"].includes(inv.status))
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Billing</h1>
        <p className="mt-1 text-sm text-ink-2">
          Ready-to-bill queue and invoices — the JobFlowGo money desk, without the extra modules.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Tile>
          <p className="text-xs font-medium text-ink-3">Ready to bill</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{ready.length}</p>
          <p className="mt-1 text-sm text-ink-2">
            <Money amount={readyValue} /> client cap
          </p>
        </Tile>
        <Tile>
          <p className="text-xs font-medium text-ink-3">Open invoices</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {invoices.filter((i) => i.status !== "paid").length}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            <Money amount={openAr} /> AR
          </p>
        </Tile>
        <Tile>
          <p className="text-xs font-medium text-ink-3">Paid</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {invoices.filter((i) => i.status === "paid").length}
          </p>
        </Tile>
      </div>

      <Tile>
        <SectionHead title="Ready to bill" sub="Send the invoice to the client from here, or open the work order" />
        {ready.length === 0 ? (
          <Empty title="Nothing waiting to bill" />
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {ready.map((wo) => {
              const site = sites.find((s) => s.id === wo.siteId);
              return (
                <li
                  key={wo.id}
                  className="flex flex-wrap items-center gap-3 rounded-card bg-sunken px-4 py-3"
                >
                  <Link href={`/work-orders/${wo.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="font-semibold tabular-nums">{wo.woNumber}</span>
                    <span className="ml-3 text-sm text-ink-2">{site?.name}</span>
                  </Link>
                  <StatusBadge status={wo.status} />
                  <span className="font-semibold tabular-nums">
                    <Money amount={wo.dne ?? wo.nte} />
                  </span>
                  <BillingSendButton workOrderId={wo.id} amount={wo.dne ?? wo.nte ?? 0} />
                </li>
              );
            })}
          </ul>
        )}
      </Tile>

      <Tile>
        <SectionHead title="Invoices" sub="Created when a work order moves into billing" />
        {invoices.length === 0 ? (
          <Empty
            title="No invoices yet"
            hint="Advance a completed work order to Ready to invoice — that writes the invoice record."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] text-ink-3">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Work order</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Client</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-hairline">
                    <td className="py-3 font-semibold tabular-nums">{invoice.invoiceNumber}</td>
                    <td className="py-3">
                      <Link
                        href={`/work-orders/${invoice.workOrderId}`}
                        className="text-navy-ink hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                    <td className="py-3">
                      <Pill tone={invoice.status === "paid" ? "good" : "navy"} className="capitalize">
                        {invoice.status}
                      </Pill>
                    </td>
                    <td className="py-3 text-right font-semibold">
                      <Money amount={invoice.amount} />
                    </td>
                    <td className="py-3 text-ink-2">
                      {invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3">
                      {invoice.status === "draft" ? (
                        <BillingSendButton
                          workOrderId={invoice.workOrderId}
                          amount={invoice.amount}
                        />
                      ) : (
                        <a
                          href={`/i/${makeShareToken("i", invoice.workOrderId)}`}
                          className="text-navy-ink hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Client view
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tile>
    </div>
  );
}
