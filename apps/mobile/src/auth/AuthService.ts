// Deliberately separate from the Repository layer: this has no DB row
// mapping, no local persistence of its own, and represents a different
// kind of boundary (identity/session, not data access).

export interface AuthSession {
  userId: string;
  isAnonymous: boolean;
}

export interface RequestEmailRegistrationParams {
  email: string;
}

export interface SignInWithPasswordParams {
  email: string;
  password: string;
}

// Only 'google' exists today — see oauthConfig.ts. Kept as a union
// (rather than a bare string) so a future provider is a type-checked
// addition here, not a silent typo at call sites.
export type OAuthProvider = 'google';

export interface CompleteOAuthSessionParams {
  accessToken: string;
  refreshToken: string;
}

export interface AuthService {
  // Returns the existing session if one is active, otherwise creates a
  // new anonymous session. Never fabricates a local id — the returned
  // userId always comes from a real auth provider session.
  getOrCreateAnonymousSession(): Promise<AuthSession>;

  getCurrentUserId(): Promise<string | null>;

  // Starts converting the anonymous session into a permanent email
  // account. Supabase requires the email identity to be verified before
  // a password can be attached, so this method deliberately does not
  // pretend to create a password-based login in one step.
  requestEmailRegistration(params: RequestEmailRegistrationParams): Promise<AuthSession>;

  // Ensures the current session's identity has a corresponding
  // server-side user_profiles row (public.user_profiles), which
  // signInAnonymously() alone does not create — attempts/exam_sessions/
  // learning_metrics all FK to it, so push sync fails without this.
  // Idempotent: safe to call every bootstrap, never overwrites an
  // already-upgraded account's status.
  ensureServerUserProfile(): Promise<void>;

  // Ensures the current session's identity has a user_profiles row with
  // account_status = 'REGISTERED'. Required after signInWithPassword():
  // an auth user created directly via the Supabase Dashboard (as opposed
  // to via the anonymous-upgrade flow) never had ensureServerUserProfile()
  // run for it, and user_profiles_insert_self only permits inserting rows
  // with account_status = 'ANONYMOUS' — so a REGISTERED user can reach
  // this app with no server-side profile row at all. Throws
  // AuthSessionError if the current session is missing or still
  // anonymous, or if either step fails.
  ensureServerRegisteredUserProfile(): Promise<void>;

  // Ends only this device's local Supabase session (clears the persisted
  // session from AsyncStorage) — not a global account logout. Other
  // sessions for the same user on other devices are left signed in.
  // Does not touch local SQLite — callers that need the device's local
  // user-scoped data cleared alongside sign-out (see LogoutUseCase) must
  // do that separately.
  signOut(): Promise<void>;

  // Signs in as an existing, already-registered Supabase user (email +
  // password). Never creates a user — that only ever happens via the
  // anonymous-upgrade path (requestEmailRegistration) or the Supabase
  // Dashboard. Does not touch local SQLite: a caller signing in as a
  // potentially different identity than the device's current local user
  // must reconcile that separately (see SignInWithPasswordUseCase).
  signInWithPassword(params: SignInWithPasswordParams): Promise<AuthSession>;

  // Changes the password of the current authenticated user only — never
  // takes a target user id, so there is no way to use this to change
  // another account's password. Requires a non-anonymous session. If the
  // account has no password identity to change (e.g. OAuth-only, once
  // that exists), Supabase's own error surfaces via AuthSessionError
  // rather than this method pretending to succeed.
  updatePassword(newPassword: string): Promise<void>;

  // Reads the current user's display name from Supabase auth user
  // metadata (`user_metadata.full_name`) — not a user_profiles column,
  // so this needs no schema migration. Returns null if unset or session
  // is missing.
  getDisplayName(): Promise<string | null>;

  // Writes the current user's display name to Supabase auth user
  // metadata. Same non-migration rationale as getDisplayName.
  updateDisplayName(fullName: string): Promise<void>;

  // Starts a browser-based OAuth sign-in: opens the provider's real
  // consent screen in the system browser (never an in-app webview, so
  // there is no way for this app's code to observe the password being
  // typed) and returns once that browser has been launched — it does
  // NOT return a session. The provider redirects back to this app via
  // the `ekyscepte://` deep link scheme (see app/auth-callback.tsx),
  // which is what actually completes the sign-in via
  // completeOAuthSession(). Callers must gate this behind the relevant
  // oauthConfig.ts flag — calling it with no provider configured in the
  // Supabase Dashboard fails at the provider's end, not silently.
  signInWithOAuthProvider(provider: OAuthProvider): Promise<void>;

  // Finishes the redirect started by signInWithOAuthProvider(): takes
  // the access/refresh token pair parsed from the deep-link callback
  // URL's fragment and establishes them as the active Supabase session.
  completeOAuthSession(params: CompleteOAuthSessionParams): Promise<AuthSession>;
}
