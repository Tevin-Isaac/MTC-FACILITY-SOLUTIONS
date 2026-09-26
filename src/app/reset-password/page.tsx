"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { buttonClass, inputClass, labelClass } from "@/components/ui";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Consuming the recovery link's URL hash is what @supabase/ssr's
    // browser client does on construction (detectSessionInUrl). We just
    // need to wait for the resulting auth event or an existing session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      toast.success("Password updated");
      router.push("/dashboard");
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
            <h1 className="text-xl font-semibold text-white">Set a new password</h1>
            <p className="mt-1 text-sm text-white/60">MTC Work Order Platform</p>
          </div>
        </div>

        <div className="mt-7 rounded-tile bg-surface p-6 shadow-lift">
          {!ready ? (
            <p className="text-sm text-ink-2">Verifying your reset link…</p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="password" className={labelClass}>
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label htmlFor="confirm" className={labelClass}>
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
