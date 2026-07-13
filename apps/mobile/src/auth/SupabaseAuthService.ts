import { Linking } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthService,
  AuthSession,
  CompleteOAuthSessionParams,
  OAuthProvider,
  RequestEmailRegistrationParams,
  SignInWithPasswordParams,
} from './AuthService';
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

  async requestEmailRegistration(params: RequestEmailRegistrationParams): Promise<AuthSession> {
    const client = this.requireClient();

    await this.ensureServerUserProfile();

    const { data, error } = await client.auth.updateUser({ email: params.email });

    if (error || !data.user) {
      throw new AuthSessionError('Failed to start email registration', error);
    }

    // Already-verified-and-registered branch (e.g. re-entering this flow
    // after email verification already completed): reuse the same
    // ensure-registered logic as signInWithPassword rather than
    // duplicating the raw upsert-then-update here.
    if (data.user.is_anonymous === false) {
      await this.ensureServerRegisteredUserProfile();
    }

    return {
      userId: data.user.id,
      isAnonymous: data.user.is_anonymous ?? true,
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

  // For non-anonymous (password/verified-email) sessions only. Handles
  // the case a dashboard-created REGISTERED auth user has no
  // user_profiles row at all: user_profiles_insert_self only allows
  // inserting with account_status = 'ANONYMOUS', so a direct REGISTERED
  // insert would be rejected by RLS. Instead this reuses the existing
  // anonymous-safe upsert to guarantee the row exists, then updates that
  // same row to REGISTERED — two RLS-legal steps, anon/authenticated
  // client only, no service_role/admin API.
  async ensureServerRegisteredUserProfile(): Promise<void> {
    const client = this.requireClient();

    const { data, error } = await client.auth.getSession();
    if (error) {
      throw new AuthSessionError('Failed to read current auth session', error);
    }
    const user = data.session?.user;
    if (!user || user.is_anonymous) {
      throw new AuthSessionError(
        'No registered session; cannot ensure registered server user profile',
      );
    }

    await this.ensureServerUserProfile();

    const { error: profileError } = await client
      .from('user_profiles')
      .update({ account_status: 'REGISTERED' })
      .eq('id', user.id);

    if (profileError) {
      throw new AuthSessionError('Failed to mark user profile as registered', profileError);
    }
  }

  async signOut(): Promise<void> {
    const client = this.requireClient();

    // scope: 'local' — ends only this device's session. The default
    // ('global') signs out every session for this user on every device,
    // which is not what "Çıkış Yap" means here (see AuthService.ts).
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      throw new AuthSessionError('Failed to sign out', error);
    }
  }

  // Existing-user sign-in only — never creates an account. Demo/QA users
  // are created out-of-band via the Supabase Dashboard, never from this
  // app (no service_role key exists in the mobile bundle to do so).
  async signInWithPassword(params: SignInWithPasswordParams): Promise<AuthSession> {
    const client = this.requireClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error || !data.session) {
      throw new AuthSessionError('Failed to sign in', error);
    }

    return {
      userId: data.session.user.id,
      isAnonymous: data.session.user.is_anonymous ?? false,
    };
  }

  // Current-user-only: supabase-js's updateUser() always targets the
  // caller's own session, so there is no id parameter to mistarget.
  async updatePassword(newPassword: string): Promise<void> {
    const client = this.requireClient();

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) {
      throw new AuthSessionError(error.message, error);
    }
  }

  async getDisplayName(): Promise<string | null> {
    const client = this.requireClient();

    const { data, error } = await client.auth.getSession();
    if (error) {
      throw new AuthSessionError('Failed to read current auth session', error);
    }
    const fullName = data.session?.user.user_metadata?.full_name;
    return typeof fullName === 'string' && fullName.length > 0 ? fullName : null;
  }

  async updateDisplayName(fullName: string): Promise<void> {
    const client = this.requireClient();

    const { error } = await client.auth.updateUser({ data: { full_name: fullName } });
    if (error) {
      throw new AuthSessionError(error.message, error);
    }
  }

  // System-browser flow only (react-native's Linking.openURL hands off
  // to Chrome/Safari, never an in-app webview) — this app's code never
  // sees the provider's login page or the password typed into it.
  // skipBrowserRedirect: true is required so supabase-js just returns
  // the provider URL instead of trying (and failing, in a non-web
  // React Native runtime) to redirect the current page itself.
  async signInWithOAuthProvider(provider: OAuthProvider): Promise<void> {
    const client = this.requireClient();

    const redirectTo = ExpoLinking.createURL('auth-callback');
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error || !data.url) {
      throw new AuthSessionError(`Failed to start ${provider} sign-in`, error);
    }

    await Linking.openURL(data.url);
  }

  async completeOAuthSession(params: CompleteOAuthSessionParams): Promise<AuthSession> {
    const client = this.requireClient();

    const { data, error } = await client.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    });

    if (error || !data.session) {
      throw new AuthSessionError('Failed to complete OAuth sign-in', error);
    }

    return {
      userId: data.session.user.id,
      isAnonymous: data.session.user.is_anonymous ?? false,
    };
  }
}
