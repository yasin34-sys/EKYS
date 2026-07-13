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
}
