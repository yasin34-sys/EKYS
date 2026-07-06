// Local-only read access to the capped free-trial mechanism (Phase
// 2B.4). Deliberately stays read-only: the write path (requesting a new
// grant, capped by a trigger server-side — see
// supabase/migrations/20260706000001_trial_access.sql) lives in
// TrialGrantSync (src/sync/TrialGrantSync.ts), not here, and is not a
// future concern anymore — GetTrialQuestionByIndexUseCase already
// consumes both this repository and TrialGrantSync together. This
// interface answers three purely local questions, from the sync mirror
// SupabasePullSync/TrialGrantSync populate: "does this device already
// have a grant for this question," "how many grants does this user
// have," and "does this user have any grant for a question currently in
// this package."
export interface TrialAccessRepository {
  hasGrant(userId: string, questionId: string): Promise<boolean>;
  getGrantedCount(userId: string): Promise<number>;
  // Added Phase 2B.4B.3: backs the package access tri-state (FULL/
  // TRIAL/LOCKED) computation's "cap already reached, but does the user
  // have an existing foothold in *this* package" fallback — true if the
  // user holds a grant for any question that currently belongs to this
  // package (via package_questions), regardless of which package the
  // grant was originally requested through (grants are per-question,
  // not per-package, per trial_access's own design).
  hasAnyGrantForPackage(userId: string, packageId: string): Promise<boolean>;
}
