"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Shield, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { supabaseIsConfigured } from "@/lib/supabase/env";
import { initialsFor, ROLE_LABEL, type PublicSession } from "@/lib/roles";

export function UserMenu({ session }: { session: PublicSession | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const configured = supabaseIsConfigured();
  const initials = session ? initialsFor(session.name, session.email) : "MT";

  async function handleSignOut() {
    setOpen(false);
    if (!configured) {
      toast.info("Not connected to a database yet — nothing to sign out of.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white transition-opacity hover:opacity-90"
        aria-label="Account menu"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-card bg-surface p-1.5 shadow-lift">
            {session && (
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium">{session.name}</p>
                <p className="truncate text-[11px] text-ink-3">
                  {ROLE_LABEL[session.role]}
                  {session.email ? ` · ${session.email}` : ""}
                </p>
              </div>
            )}
            {session?.isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm transition-colors hover:bg-tint"
              >
                <Shield className="h-4 w-4 text-ink-3" />
                Admin
              </Link>
            )}
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm transition-colors hover:bg-tint"
            >
              <LayoutDashboard className="h-4 w-4 text-ink-3" />
              Floor dashboard
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-sm transition-colors hover:bg-tint"
            >
              <LogOut className="h-4 w-4 text-ink-3" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
