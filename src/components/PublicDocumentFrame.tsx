import Image from "next/image";
import type { ReactNode } from "react";

export function PublicDocumentFrame({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-full bg-navy-deep px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white">
            <Image src="/mtc-logo.png" alt="MTC" width={48} height={48} className="h-full w-full object-contain" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">{eyebrow}</p>
            <h1 className="text-xl font-semibold text-white">{title}</h1>
            <p className="mt-0.5 text-sm text-white/65">{subtitle}</p>
          </div>
        </div>
        <div className="mt-6 rounded-tile bg-surface p-6 shadow-lift">{children}</div>
        <p className="mt-5 text-center text-xs text-white/45">
          MTC Facility Solutions LLC · This link is for the named client only.
        </p>
      </div>
    </main>
  );
}
