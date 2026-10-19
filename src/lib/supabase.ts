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

// Check if credentials are valid and not placeholders or dead hosts
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (
    supabaseUrl.includes('your-project-id') ||
    supabaseUrl.includes('aojysjfwipdqwhxyqifx') ||
    supabaseAnonKey.includes('...')
  ) {
    return false;
  }
  try {
    const url = new URL(supabaseUrl);
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
};

const getCleanSupabaseUrl = (raw: string) => {
  return raw.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '').trim();
};

// Initialize the client conditionally to prevent runtime exceptions when env vars are pending
export let supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(getCleanSupabaseUrl(supabaseUrl), supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
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
          supabase = createClient(getCleanSupabaseUrl(supabaseUrl), supabaseAnonKey, {
            auth: {
              storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
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
