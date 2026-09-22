import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service role key, so it bypasses row level
// security. Never import this from a client component — it must only run
// on the server (API routes, server components, server actions).
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env vars ontbreken. Zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    // Next.js patches global fetch and caches it by default in server
    // components; force no-store explicitly so dashboard/client pages
    // always see fresh data instead of a stale cached response.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
