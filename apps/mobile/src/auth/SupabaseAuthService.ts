import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthService, AuthSession, UpgradeAnonymousAccountParams } from './AuthService';
import { AuthNotConfiguredError, AuthSessionError } from './errors';

// Bootstrap must never hang forever on a stalled/dropped connection —
// signInAnonymously() has been observed to neither resolve nor reject
// on some devices/networks. This bounds the wait so bootstrap always
// reaches a definite state (ready, offline-tolerant, or a surfaced
// error) instead of leaving the app stuck on its loading screen.
const ANONYMOUS_SIGN_IN_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new AuthSessionError(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export class SupabaseAuthService implements AuthService {
  // client is nullable — supabaseClient.ts guards against constructing
  // a SupabaseClient before real credentials exist. Every method here
  // fails gracefully with AuthNotConfiguredError rather than throwing
  // an opaque null-reference error.
  constructor(private readonly client: SupabaseClient | null) {}

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new AuthNotConfiguredError();
    }
    return this.client;
  }

  async getOrCreateAnonymousSession(): Promise<AuthSession> {
    const client = this.requireClient();

    const { data: existing, error: getError } = await client.auth.getSession();
    if (getError) {
      throw new AuthSessionError('Failed to read existing auth session', getError);
    }
    if (existing.session) {
      return {
        userId: existing.session.user.id,
        isAnonymous: existing.session.user.is_anonymous ?? false,
      };
    }

    const { data, error } = await withTimeout(
      client.auth.signInAnonymously(),
      ANONYMOUS_SIGN_IN_TIMEOUT_MS,
      'Timed out creating anonymous session',
    );
    if (error || !data.session) {
      throw new AuthSessionError('Failed to create anonymous session', error);
    }

    return {
      userId: data.session.user.id,
      isAnonymous: data.session.user.is_anonymous ?? true,
    };
  }

  async getCurrentUserId(): Promise<string | null> {
    const client = this.requireClient();

    const { data, error } = await client.auth.getSession();
    if (error) {
      throw new AuthSessionError('Failed to read current auth session', error);
    }
    return data.session?.user.id ?? null;
  }

  async upgradeAnonymousAccount(params: UpgradeAnonymousAccountParams): Promise<AuthSession> {
    const client = this.requireClient();

    const { data, error } = await client.auth.updateUser({
      email: params.email,
      password: params.password,
    });

    if (error || !data.user) {
      throw new AuthSessionError('Failed to upgrade anonymous account', error);
    }

    return {
      userId: data.user.id,
      isAnonymous: data.user.is_anonymous ?? false,
    };
  }

  // Idempotent by construction: `ignoreDuplicates` turns this into
  // INSERT ... ON CONFLICT (id) DO NOTHING, so it only ever inserts a
  // missing row and never touches an existing one's account_status —
  // safe to call on every bootstrap regardless of whether the row
  // already exists or the account was since upgraded to REGISTERED.
  // Relies on the existing "user_profiles_insert_self" RLS policy
  // (id = auth.uid() and account_status = 'ANONYMOUS'); no migration
  // needed.
  async ensureServerUserProfile(): Promise<void> {
    const client = this.requireClient();

    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new AuthSessionError('No current session; cannot ensure server user profile');
    }

    const { error } = await client
      .from('user_profiles')
      .upsert(
        { id: userId, account_status: 'ANONYMOUS' },
        { onConflict: 'id', ignoreDuplicates: true },
      );

    if (error) {
      throw new AuthSessionError('Failed to ensure server user profile', error);
    }
  }
}
