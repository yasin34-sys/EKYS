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
 *
 * react-native-url-polyfill is very likely also needed for
 * @supabase/supabase-js to work correctly under Hermes (a well-known
 * requirement for Supabase + React Native), but it wasn't part of the
 * approved dependency list for this phase, so it has not been added.
 * Flagging rather than silently installing it.
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
