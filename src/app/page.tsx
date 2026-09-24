import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-navy px-6 text-center text-white">
      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-white p-4 shadow-lg">
        <Image
          src="/mtc-logo.png"
          alt="MTC Facility Solutions"
          width={120}
          height={120}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      <h1 className="text-2xl font-semibold">MTC Work Order Platform</h1>
      <p className="max-w-md text-white/70">
        Internal dispatch, quoting, and work-order management for MTC
        Facility Solutions.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-brand-gold px-6 py-3 text-sm font-semibold text-brand-navy-dark hover:brightness-95"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
