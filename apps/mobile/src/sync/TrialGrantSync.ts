import type { DB } from '@op-engineering/op-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SyncNotConfiguredError } from './errors';
import type {
  TrialCandidateQuestion,
  TrialGrantHydrationResult,
  TrialGrantParams,
  TrialGrantSyncPort,
} from './types';

// Substring match against the trigger's own RAISE EXCEPTION message
// (check_trial_access_grant(), 20260706000001_trial_access.sql) — every
// raise in that function shares the same default SQLSTATE (P0001), so
// there is no structured error code to branch on. This is fragile by
// nature (it breaks if the trigger's message text changes) but it's
// what's available without touching an already-applied migration; a
// future migration could assign the cap-exceeded path its own SQLSTATE
// if this needs to be more robust later.
const CAP_REACHED_MESSAGE_FRAGMENT = 'cap of';

// Writes directly to SQLite rather than through Repository, same
// documented exception SupabasePullSync already establishes —
// Application/UI code has no write path into questions/question_options/
// package_questions/trial_access, and this class is the other place
// (alongside SupabasePullSync's bulk pull) that does, strictly on the
// client's own behalf, after a real server-side grant succeeds.
//
// Deliberately does not cache candidate rows locally (Phase 2B.4B.2
// scope): every getCandidates() call is a live query against
// trial_candidate_questions, and requestAndHydrate() only ever acts on
// a question a live getCandidates() call just returned. If the device
// is offline, getCandidates() has nothing to return and
// requestAndHydrate() cannot reach the server to create a new grant —
// no new access is ever minted without a live round trip. Already-
// granted questions remain servable offline through the ordinary
// QuestionRepository/local SQLite path, untouched by this class.
export class TrialGrantSync implements TrialGrantSyncPort {
  constructor(
    private readonly client: SupabaseClient | null,
    private readonly db: DB,
  ) {}

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new SyncNotConfiguredError();
    }
    return this.client;
  }

  // Queries only the trial_candidate_questions view (20260706000003) —
  // never package_questions directly, which a non-entitled, non-free-
  // tier user has no RLS visibility into in the first place. This is
  // the only legitimate source of a question_id to request a grant for.
  async getCandidates(packageId: string): Promise<TrialCandidateQuestion[]> {
    const client = this.requireClient();

    const { data, error } = await client
      .from('trial_candidate_questions')
      .select('package_id, question_id, display_order')
      .eq('package_id', packageId)
      .order('display_order', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      packageId: row.package_id as string,
      questionId: row.question_id as string,
      displayOrder: row.display_order as number,
    }));
  }

  // Request a grant for one specific question, then hydrate exactly
  // that question locally. Every early return below is a deliberate,
  // named outcome (Phase 2B.4B.2 scope: foundation only, no UI reads
  // this yet, but the shape is what a later UI needs to distinguish
  // "premium required" from "try again" from "something is broken").
  async requestAndHydrate(params: TrialGrantParams): Promise<TrialGrantHydrationResult> {
    let client: SupabaseClient;
    try {
      client = this.requireClient();
    } catch {
      return { status: 'OFFLINE' };
    }

    // Idempotent by construction: onConflict + ignoreDuplicates turns
    // this into INSERT ... ON CONFLICT (user_id, question_id) DO
    // NOTHING at the server — a repeat request for a grant the user
    // already holds is silently absorbed here, and separately by the
    // trigger's own idempotency short-circuit if it were ever reached
    // for an existing row some other way.
    let insertError: { message: string } | null = null;
    try {
      const { error } = await client.from('trial_access').upsert(
        { user_id: params.userId, package_id: params.packageId, question_id: params.questionId },
        { onConflict: 'user_id,question_id', ignoreDuplicates: true },
      );
      insertError = error;
    } catch {
      // A thrown (rather than a returned-as-error) failure means the
      // request never reached the server in a well-formed way — the
      // closest signal available, without a network-reachability
      // dependency, that this device is offline.
      return { status: 'OFFLINE' };
    }

    if (insertError) {
      if (insertError.message?.includes(CAP_REACHED_MESSAGE_FRAGMENT)) {
        return { status: 'CAP_REACHED' };
      }
      return { status: 'REJECTED', message: insertError.message };
    }

    // ON CONFLICT ... DO NOTHING means a successful call above doesn't
    // guarantee this exact row was newly inserted (it may already have
    // existed) — either way a grant now exists, which is all that
    // matters for what follows. Re-reading it (rather than trusting a
    // locally-constructed row) is what gives us the server-assigned id.
    const { data: grantRow, error: grantReadError } = await client
      .from('trial_access')
      .select('id, user_id, question_id, package_id, granted_at, created_at')
      .eq('user_id', params.userId)
      .eq('question_id', params.questionId)
      .maybeSingle();

    if (grantReadError || !grantRow) {
      return { status: 'NOT_VISIBLE_AFTER_GRANT' };
    }

    const { data: questionRow, error: questionError } = await client
      .from('questions')
      .select('*')
      .eq('id', params.questionId)
      .maybeSingle();

    if (questionError || !questionRow) {
      return { status: 'NOT_VISIBLE_AFTER_GRANT' };
    }

    const { data: optionRows, error: optionsError } = await client
      .from('question_options')
      .select('*')
      .eq('question_id', params.questionId)
      .order('display_order', { ascending: true });

    if (optionsError) {
      return { status: 'NOT_VISIBLE_AFTER_GRANT' };
    }

    const { data: packageQuestionRow, error: pqError } = await client
      .from('package_questions')
      .select('package_id, question_id, display_order, created_at')
      .eq('package_id', params.packageId)
      .eq('question_id', params.questionId)
      .maybeSingle();

    if (pqError || !packageQuestionRow) {
      return { status: 'NOT_VISIBLE_AFTER_GRANT' };
    }

    try {
      // Single transaction for the entire local hydration sequence —
      // not one transaction per table. FK-safe order inside it:
      // questions -> question_options -> package_questions ->
      // trial_access, same direction SupabasePullSync's pull() already
      // documents and depends on. If any step throws, op-sqlite rolls
      // back everything in this callback (see SupabasePullSync.
      // pullQuestionOptions' own comment on this behavior) — so a
      // failure partway through leaves nothing from this attempt
      // locally, rather than a partially-hydrated question (e.g. a
      // questions row with no options yet).
      await this.db.transaction(async (tx) => {
        await tx.execute(
          `INSERT INTO questions (id, exam_id, topic_id, question_type, body, revision, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             exam_id = excluded.exam_id,
             topic_id = excluded.topic_id,
             question_type = excluded.question_type,
             body = excluded.body,
             revision = excluded.revision,
             status = excluded.status,
             updated_at = excluded.updated_at;`,
          [
            questionRow.id,
            questionRow.exam_id,
            questionRow.topic_id,
            questionRow.question_type,
            questionRow.body,
            questionRow.revision,
            questionRow.status,
            questionRow.created_at,
            questionRow.updated_at,
          ],
        );

        // Same clear-then-upsert pattern as SupabasePullSync.
        // pullQuestionOptions, applied to this single question — clears
        // is_correct = 0 first so the partial unique index (one
        // is_correct = 1 row per question) never sees two correct rows
        // at once, then upserts every pulled option. Sharing this same
        // outer transaction (not a nested one) is what makes a later
        // failure in package_questions/trial_access also undo this step.
        await tx.execute(`UPDATE question_options SET is_correct = 0 WHERE question_id = ?;`, [
          params.questionId,
        ]);

        for (const row of optionRows ?? []) {
          await tx.execute(
            `INSERT INTO question_options (id, question_id, label, body, is_correct, display_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET
               label = excluded.label,
               body = excluded.body,
               is_correct = excluded.is_correct,
               display_order = excluded.display_order;`,
            [
              row.id,
              row.question_id,
              row.label,
              row.body,
              row.is_correct ? 1 : 0,
              row.display_order,
              row.created_at,
            ],
          );
        }

        await tx.execute(
          `INSERT INTO package_questions (package_id, question_id, display_order, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (package_id, question_id) DO UPDATE SET
             display_order = excluded.display_order;`,
          [
            packageQuestionRow.package_id,
            packageQuestionRow.question_id,
            packageQuestionRow.display_order,
            packageQuestionRow.created_at,
          ],
        );

        // Conflict target is the logical grant key (user_id,
        // question_id) — not id — so a locally-already-present grant
        // (e.g. from a prior bulk pull, or a retried request) never
        // fails this insert, matching the unique constraint the local
        // schema already enforces. SupabasePullSync.pullTrialAccess
        // still upserts by id for its own bulk-reconciliation reasons;
        // the two are consistent in effect (both are idempotent no-ops
        // on a repeat), just keyed differently for their different call
        // shapes.
        await tx.execute(
          `INSERT INTO trial_access (id, user_id, question_id, package_id, granted_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id, question_id) DO NOTHING;`,
          [
            grantRow.id,
            grantRow.user_id,
            grantRow.question_id,
            grantRow.package_id,
            grantRow.granted_at,
            grantRow.created_at,
          ],
        );
      });
    } catch (cause) {
      return { status: 'HYDRATION_FAILED', cause };
    }

    return { status: 'GRANTED' };
  }
}
