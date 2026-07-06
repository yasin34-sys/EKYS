// Deliberately separate from the Repository layer: this has no DB row
// mapping, no local persistence of its own, and represents a different
// kind of boundary (identity/session, not data access).

export interface AuthSession {
  userId: string;
  isAnonymous: boolean;
}

export interface UpgradeAnonymousAccountParams {
  email: string;
  password: string;
}

export interface AuthService {
  // Returns the existing session if one is active, otherwise creates a
  // new anonymous session. Never fabricates a local id — the returned
  // userId always comes from a real auth provider session.
  getOrCreateAnonymousSession(): Promise<AuthSession>;

  getCurrentUserId(): Promise<string | null>;

  // Placeholder: no login/register UI exists yet to drive this. Wired
  // to the real Supabase anonymous-upgrade mechanism (preserves the
  // same user id, per ADR-009) but untested against a live project.
  upgradeAnonymousAccount(params: UpgradeAnonymousAccountParams): Promise<AuthSession>;

  // Ensures the current session's identity has a corresponding
  // server-side user_profiles row (public.user_profiles), which
  // signInAnonymously() alone does not create — attempts/exam_sessions/
  // learning_metrics all FK to it, so push sync fails without this.
  // Idempotent: safe to call every bootstrap, never overwrites an
  // already-upgraded account's status.
  ensureServerUserProfile(): Promise<void>;
}
