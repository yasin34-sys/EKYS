import type { SyncResult } from './types';

// user_profiles, entitlements, package_access, published exams/topics/
// packages metadata, and — as an interim direct-table hydration path,
// not the final architecture — questions/question_options/
// package_questions content, gated entirely by existing Supabase RLS
// (no client-side entitlement logic layered on top). This stands in
// for the real ADR-005 package bundle download/import pipeline
// (versioned bundle artifact, checksum-verified, Storage + signed URL)
// until that is built, and should be replaced — not extended — once
// the real mechanism exists.
//
// Also pulls trial_access (Phase 2B.4) — the server-authoritative
// record of this user's capped (100 total) per-Question free-trial
// grants, pulled last (after questions/question_options/
// package_questions) since its local row FKs to both. Unlike the
// interim content hydration above, trial_access is not a placeholder
// for a future mechanism — it is the permanent record of which
// otherwise-premium questions this user has legitimately unlocked.
export interface PullSync {
  pull(): Promise<SyncResult>;
}
