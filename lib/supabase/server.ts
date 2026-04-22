import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function supabaseServer() {
  const cookieStore = cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
