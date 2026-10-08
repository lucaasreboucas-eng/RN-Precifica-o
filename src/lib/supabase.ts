import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

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
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabaseConfigStatus = () => {
  return {
    isConfigured: isSupabaseConfigured(),
    urlConfigured: Boolean(supabaseUrl && !supabaseUrl.includes('your-project-id')),
    keyConfigured: Boolean(supabaseAnonKey && !supabaseAnonKey.includes('...')),
    rawUrl: supabaseUrl || '',
  };
};
