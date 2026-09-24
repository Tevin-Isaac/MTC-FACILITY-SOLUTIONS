"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Supabase's auth emails (password recovery, magic link) redirect to the
// project's configured Site URL — which is the site root, not a specific
// page — carrying the session tokens in the URL hash (e.g.
// #access_token=...&type=recovery). This forwards that hash to the page
// that actually knows what to do with it, before anyone sees a blank
// landing page.
export function AuthHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") && (hash.includes("type=recovery") || hash.includes("type=magiclink") || hash.includes("type=invite"))) {
      router.replace(`/reset-password${hash}`);
    }
  }, [router]);

  return null;
}
