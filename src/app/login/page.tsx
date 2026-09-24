"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { supabaseIsConfigured } from "@/lib/supabase/env";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = supabaseIsConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!configured) {
      setError(
        "Supabase isn't connected yet. This login screen is ready — it'll work as soon as a project is linked."
      );
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push(searchParams.get("next") ?? "/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-navy px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white p-3 shadow-lg">
        <Image
          src="/mtc-logo.png"
          alt="MTC Facility Solutions"
          width={72}
          height={72}
          className="h-full w-full object-contain"
          priority
        />
      </div>

      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-raised p-6 shadow-2xl">
        <h1 className="text-lg font-semibold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted">MTC Work Order Platform</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="text-xs font-medium text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-gold"
              placeholder="you@mtcfacilitysolutions.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-medium text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-gold"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-status-critical">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-navy-dark disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      {!configured && (
        <p className="max-w-sm text-center text-xs text-white/50">
          Running without a connected database — this form is wired up and
          will work once Supabase credentials are added.
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
