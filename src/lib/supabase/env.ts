// Central check for whether Supabase credentials are configured. Auth and
// data-fetching code use this to fail clearly (or, in middleware, to no-op)
// instead of throwing an opaque error when .env.local is empty — this is
// the expected state until a Supabase project is connected.
export function supabaseIsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
