"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { supabaseIsConfigured } from "@/lib/supabase/env";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = supabaseIsConfigured();

  async function handleForgotPassword() {
    setError(null);
    if (!configured) {
      setError("Supabase isn't connected yet.");
      return;
    }
    if (!email) {
      setError('Enter your email above first, then click "Forgot password".');
      return;
    }
    setResetting(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      toast.success("Check your email", {
        description: `A password reset link was sent to ${email}.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setResetting(false);
    }
  }

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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-navy-deep px-5 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-gold/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-card bg-white p-2.5 shadow-lift">
            <Image
              src="/mtc-logo.png"
              alt="MTC Facility Solutions"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-white">MTC Work Order Platform</h1>
            <p className="mt-1 text-sm text-white/60">Sign in to continue</p>
          </div>
        </div>

        <div className="mt-7 rounded-tile bg-surface p-6 shadow-lift">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@mtcfacilitysolutions.com"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetting}
                  className="mb-1.5 text-xs font-medium text-navy-ink hover:underline disabled:opacity-50"
                >
                  {resetting ? "Sending…" : "Forgot password?"}
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-control bg-critical-tint px-3 py-2.5 text-xs text-critical">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={buttonClass("primary", "mt-1 w-full")}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        {!configured && (
          <p className="mt-5 text-center text-xs text-white/45">
            Running without a connected database — this form is wired up and will work
            once Supabase credentials are added.
          </p>
        )}
      </div>
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
