import type { SyncRowError } from './errors';

export interface TableSyncResult {
  table: string;
  succeeded: number;
  failed: number;
  errors: SyncRowError[];
}

export interface SyncResult {
  startedAt: string;
  finishedAt: string;
  tables: TableSyncResult[];
  ok: boolean;
}

// One row of the trial_candidate_questions view (Phase 2B.4B.1) —
// structural discovery only, never content. See TrialGrantSync.
export interface TrialCandidateQuestion {
  packageId: string;
  questionId: string;
  displayOrder: number;
}

export interface TrialGrantParams {
  userId: string;
  packageId: string;
  questionId: string;
}

// Discriminated so a later UI layer can distinguish exactly what
// happened without inspecting error messages itself. CAP_REACHED is
// split out from REJECTED because it's the one outcome UI is expected
// to treat specially (a clear "premium required" state) rather than a
// generic failure.
export type TrialGrantHydrationResult =
  | { status: 'GRANTED' }
  | { status: 'CAP_REACHED' }
  | { status: 'REJECTED'; message: string }
  | { status: 'OFFLINE' }
  | { status: 'NOT_VISIBLE_AFTER_GRANT' }
  | { status: 'HYDRATION_FAILED'; cause: unknown };

// Public contract for TrialGrantSync, separated from the concrete class
// the same way SyncService/PullSync are separated from
// DefaultSyncService/SupabasePullSync — TrialGrantSync has private
// constructor fields, so a duck-typed web-preview stand-in can't
// structurally satisfy the class type itself (TypeScript classes with
// private members are nominally branded); Services must reference this
// interface, not the class, for that stand-in to type-check.
export interface TrialGrantSyncPort {
  getCandidates(packageId: string): Promise<TrialCandidateQuestion[]>;
  requestAndHydrate(params: TrialGrantParams): Promise<TrialGrantHydrationResult>;
}
