import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function DashboardHero({
  greeting,
  summary,
}: {
  greeting: string;
  summary: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-navy via-brand-navy to-[#12306b] p-8 text-white shadow-lg">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-gold/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-blue-400/10 blur-3xl"
      />

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold sm:text-3xl">{greeting}</h1>
          <p className="mt-2 text-sm text-white/70 sm:text-base">{summary}</p>
          <Link
            href="/work-orders"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-gold px-5 py-2.5 text-sm font-semibold text-brand-navy-dark transition-transform hover:scale-[1.02]"
          >
            View work orders
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="hidden shrink-0 items-center justify-center rounded-2xl bg-white/10 p-4 backdrop-blur-sm sm:flex">
          <Image
            src="/mtc-logo.png"
            alt=""
            width={88}
            height={88}
            className="h-20 w-20 object-contain opacity-90"
          />
        </div>
      </div>
    </div>
  );
}
