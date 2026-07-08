// Must run before any @supabase/supabase-js import touches `URL` —
// Hermes's built-in URL implementation doesn't match the WHATWG
// behavior supabase-js's auth/postgrest clients rely on, which is a
// well-known cause of requests (e.g. signInAnonymously()) silently
// hanging instead of resolving or rejecting on React Native.
import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Placeholder only. No real Supabase project exists yet, so
 * supabaseUrl/supabaseAnonKey are undefined until real credentials are
 * added in a later phase (explicitly out of scope here). Guarded so
 * importing this module doesn't throw before that happens — `supabase`
 * is null until both env vars are actually set.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
