import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        MTC Work Order Platform
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Internal dispatch, quoting, and work-order management for MTC
        Facility Solutions.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
