import { Building2 } from "lucide-react";
import { mockAccounts, mockSites } from "@/lib/mock-data";

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="mt-1 text-sm text-muted">
          Accounts and their sites. {mockAccounts.length} accounts,{" "}
          {mockSites.length} sites.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {mockAccounts.map((account) => {
          const sites = mockSites.filter((s) => s.accountId === account.id);
          return (
            <div
              key={account.id}
              className="rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-navy text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="text-xs capitalize text-muted">{account.type}</p>
                </div>
              </div>

              <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {sites.length === 0 && (
                  <li className="text-sm text-muted">No sites on file.</li>
                )}
                {sites.map((site) => (
                  <li key={site.id} className="text-sm">
                    <p className="font-medium">{site.name}</p>
                    <p className="text-xs text-muted">{site.address}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
