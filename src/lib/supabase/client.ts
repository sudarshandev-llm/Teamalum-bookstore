import { createBrowserClient } from '@supabase/ssr';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === 'https://placeholder.supabase.co') {
    // Return a placeholder that won't throw during build/SSR
    // Real client is created on the client side
    supabaseClient = createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder-key'
    );
    return supabaseClient;
  }

  supabaseClient = createBrowserClient(url, key);
  return supabaseClient;
}
