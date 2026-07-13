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
}
