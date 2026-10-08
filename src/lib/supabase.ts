import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;

// Retrieve credentials from common environment variable naming conventions
let supabaseUrl = (
  env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  env.SUPABASE_URL ||
  ''
).trim();

let supabaseAnonKey = (
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  ''
).trim();

// Check if credentials are valid and not placeholders
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('your-project-id') || supabaseAnonKey.includes('...')) return false;
  try {
    const url = new URL(supabaseUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

// Initialize the client conditionally to prevent runtime exceptions when env vars are pending
export let supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabaseClient = async (): Promise<SupabaseClient | null> => {
  if (supabase) return supabase;
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data?.supabaseUrl && data?.supabaseAnonKey) {
        supabaseUrl = String(data.supabaseUrl).trim();
        supabaseAnonKey = String(data.supabaseAnonKey).trim();
        if (isSupabaseConfigured()) {
          supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          });
          return supabase;
        }
      }
    }
  } catch {
    // ignore runtime config fetch errors
  }
  return supabase;
};

export const getSupabaseConfigStatus = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    urlConfigured: Boolean(supabaseUrl && !supabaseUrl.includes('your-project-id')),
    keyConfigured: Boolean(supabaseAnonKey && !supabaseAnonKey.includes('...')),
    rawUrl: supabaseUrl || '',
  };
};
