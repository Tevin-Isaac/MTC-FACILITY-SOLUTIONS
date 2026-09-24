"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client, for use in Client Components.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase isn't configured yet. Copy .env.example to .env.local and fill in your project's URL and anon key."
    );
  }
  return createBrowserClient(url, anonKey);
}
