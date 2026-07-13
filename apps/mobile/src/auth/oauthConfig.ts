// Google sign-in needs a Google Cloud OAuth client (Web + Android client
// IDs) wired into this Supabase project's Auth > Providers > Google
// setting — neither exists yet. Until an env var is actually set (in
// EAS/CI secrets, never hardcoded here), this reads false and the
// Google button stays hidden rather than rendering broken. Never a
// client secret — only a public-safe "is this turned on" flag belongs
// in an EXPO_PUBLIC_ var.
export const GOOGLE_OAUTH_ENABLED = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true';

// Apple requires Sign in with Apple to be offered wherever a third-party
// login (Google) is offered on iOS (App Store Review Guideline 4.8) —
// so Google must stay hidden on iOS until Apple's own flow ships
// alongside it, regardless of GOOGLE_OAUTH_ENABLED. Android has no such
// parity requirement.
export const APPLE_SIGN_IN_ENABLED = process.env.EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED === 'true';
