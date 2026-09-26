import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthHashRedirect } from "@/components/AuthHashRedirect";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-navy-deep px-6 py-16 text-center text-white">
      <AuthHashRedirect />

      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-gold/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative flex flex-col items-center gap-6">
        <span className="flex h-24 w-24 items-center justify-center rounded-hero bg-white p-4 shadow-lift">
          <Image
            src="/mtc-logo.png"
            alt="MTC Facility Solutions"
            width={96}
            height={96}
            className="h-full w-full object-contain"
            priority
          />
        </span>

        <h1 className="max-w-lg text-3xl font-semibold tracking-[-0.02em]">
          MTC Work Order Platform
        </h1>
        <p className="max-w-md text-white/65">
          Dispatch, quoting, and work-order management for MTC Facility Solutions.
        </p>

        <Link
          href="/dashboard"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy-deep transition-colors hover:bg-gold/85"
        >
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
