import type { DB } from '@op-engineering/op-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthService } from '../auth/AuthService';
import type { PullSync } from './PullSync';
import type { SyncResult, TableSyncResult } from './types';
import { SyncNotConfiguredError, SyncRowError } from './errors';

// Writes directly to SQLite rather than through Repository, by design
// (see the Mobile Architecture Plan's SQLite Local-First
// Responsibilities section): Repository's app-facing API for these
// tables is read-only — Application/UI code has no write path into
// Exam/Topic/Package/Entitlement/PackageAccess/UserProfile, and adding
// upsert methods to those public interfaces would misleadingly suggest
// the Application layer could call them. The sync engine is the one
// exception, and it writes directly.
//
// Known limitation, not silently hidden: several of these tables have
// an unconditional AFTER UPDATE trigger that overwrites updated_at
// with the local device's current time (trg_exams_set_updated_at,
// trg_topics_set_updated_at, trg_packages_set_updated_at,
// trg_questions_set_updated_at are not column-scoped the way
// exam_sessions/attempts/learning_metrics are). That means a pulled
// row's local updated_at reflects "last local sync time," not the
// server's true updated_at, once an UPDATE branch of an upsert fires.
// No current code depends on that value for staleness detection, so
// this is harmless today but would need addressing if that ever
// changes.
//
// Second known limitation: topics.parent_topic_id has a BEFORE INSERT
// integrity trigger requiring the parent to already exist locally. If
// the server returns a child topic before its parent in the same pull,
// that single row's insert fails (surfaced as a SyncRowError, not a
// crash) rather than being retried in a corrected order — no
// topological sort is implemented here.
//
// Third known limitation, new with the interim content hydration below
// (questions/question_options/package_questions): this pass never
// deletes local rows that no longer come back from the server (e.g. a
// question unpublished/removed from a package). Stale-content cleanup
// is not implemented — flagged as a remaining gap, not silently
// dropped. This whole block is an interim direct-table hydration path,
// not the final ADR-005 package bundle pipeline — see PullSync.ts.
//
// Fourth: trial_access (Phase 2B.4) is pulled last, deliberately after
// questions/question_options/package_questions rather than alongside
// entitlements/package_access — its local row has FK references to
// both questions(id) and packages(id) (see schema.ts), so those must
// already exist locally before trial_access can be inserted. It is
// conceptually an access-model table (like entitlements/package_access)
// but its FK shape puts it after the content tables in pull order, not
// before them.
export class SupabasePullSync implements PullSync {
  constructor(
    private readonly client: SupabaseClient | null,
    private readonly db: DB,
    private readonly authService: AuthService,
  ) {}

  async pull(): Promise<SyncResult> {
    const startedAt = new Date().toISOString();

    if (!this.client) {
      throw new SyncNotConfiguredError();
    }
    const client = this.client;

    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      throw new SyncNotConfiguredError();
    }

    // Order matters, and must satisfy every FK a later table in this
    // list depends on, not just the ones between adjacent steps:
    // entitlements references both user_profiles AND exams, and
    // package_access references both entitlements AND packages. On a
    // brand-new device with nothing pulled yet, inserting entitlements/
    // package_access before exams/packages exist locally violates the
    // local schema's FK constraints (PRAGMA foreign_keys = ON) — so
    // content tables must be pulled before the access tables that
    // reference them.
    const tables = [
      await this.pullUserProfile(client, userId),
      await this.pullExams(client),
      await this.pullTopics(client),
      await this.pullPackages(client),
      await this.pullEntitlements(client, userId),
      await this.pullPackageAccess(client, userId),
      // Interim content hydration (see PullSync.ts / class doc-comment
      // above) — questions require exams/topics (already pulled);
      // package_questions requires packages (already pulled) and
      // questions (pulled just before it).
      await this.pullQuestions(client),
      await this.pullQuestionOptions(client),
      await this.pullPackageQuestions(client),
      // trial_access last — see the fourth known limitation above.
      await this.pullTrialAccess(client, userId),
    ];

    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      tables,
      ok: tables.every((t) => t.failed === 0),
    };
  }

  private async pullUserProfile(client: SupabaseClient, userId: string): Promise<TableSyncResult> {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return {
        table: 'user_profiles',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('user_profiles', userId, error)],
      };
    }
    if (!data) {
      return { table: 'user_profiles', succeeded: 0, failed: 0, errors: [] };
    }

    try {
      await this.db.execute(
        `INSERT INTO user_profiles (id, account_status, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           account_status = excluded.account_status,
           updated_at = excluded.updated_at;`,
        [data.id, data.account_status, data.created_at, data.updated_at],
      );
      return { table: 'user_profiles', succeeded: 1, failed: 0, errors: [] };
    } catch (cause) {
      return {
        table: 'user_profiles',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('user_profiles', userId, cause)],
      };
    }
  }

  private async pullEntitlements(client: SupabaseClient, userId: string): Promise<TableSyncResult> {
    const { data, error } = await client.from('entitlements').select('*').eq('user_id', userId);
    if (error) {
      return {
        table: 'entitlements',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('entitlements', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        await this.db.execute(
          `INSERT INTO entitlements (id, user_id, exam_id, status, source, granted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             status = excluded.status,
             source = excluded.source,
             updated_at = excluded.updated_at;`,
          [row.id, row.user_id, row.exam_id, row.status, row.source, row.granted_at, row.created_at, row.updated_at],
        );
        succeeded++;
      } catch (cause) {
        errors.push(new SyncRowError('entitlements', row.id, cause));
      }
    }

    return { table: 'entitlements', succeeded, failed: errors.length, errors };
  }

  private async pullPackageAccess(client: SupabaseClient, userId: string): Promise<TableSyncResult> {
    // package_access has no user_id column of its own — scoped via the
    // entitlements this user owns.
    const { data, error } = await client
      .from('package_access')
      .select('entitlement_id, package_id, created_at, entitlements!inner(user_id)')
      .eq('entitlements.user_id', userId);

    if (error) {
      return {
        table: 'package_access',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('package_access', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        await this.db.execute(
          `INSERT INTO package_access (entitlement_id, package_id, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT (entitlement_id, package_id) DO NOTHING;`,
          [row.entitlement_id, row.package_id, row.created_at],
        );
        succeeded++;
      } catch (cause) {
        errors.push(new SyncRowError('package_access', `${row.entitlement_id}:${row.package_id}`, cause));
      }
    }

    return { table: 'package_access', succeeded, failed: errors.length, errors };
  }

  private async pullExams(client: SupabaseClient): Promise<TableSyncResult> {
    const { data, error } = await client.from('exams').select('*').eq('status', 'PUBLISHED');
    if (error) {
      return {
        table: 'exams',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('exams', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        await this.db.execute(
          `INSERT INTO exams (id, name, status, question_count, duration_minutes, passing_score, supersedes_exam_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             name = excluded.name,
             status = excluded.status,
             question_count = excluded.question_count,
             duration_minutes = excluded.duration_minutes,
             passing_score = excluded.passing_score,
             supersedes_exam_id = excluded.supersedes_exam_id,
             updated_at = excluded.updated_at;`,
          [
            row.id,
            row.name,
            row.status,
            row.question_count,
            row.duration_minutes,
            row.passing_score,
            row.supersedes_exam_id,
            row.created_at,
            row.updated_at,
          ],
        );
        succeeded++;
      } catch (cause) {
        errors.push(new SyncRowError('exams', row.id, cause));
      }
    }

    return { table: 'exams', succeeded, failed: errors.length, errors };
  }

  private async pullTopics(client: SupabaseClient): Promise<TableSyncResult> {
    const { data, error } = await client.from('topics').select('*').eq('status', 'PUBLISHED');
    if (error) {
      return {
        table: 'topics',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('topics', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        await this.db.execute(
          `INSERT INTO topics (id, exam_id, parent_topic_id, name, display_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             exam_id = excluded.exam_id,
             parent_topic_id = excluded.parent_topic_id,
             name = excluded.name,
             display_order = excluded.display_order,
             status = excluded.status,
             updated_at = excluded.updated_at;`,
          [
            row.id,
            row.exam_id,
            row.parent_topic_id,
            row.name,
            row.display_order,
            row.status,
            row.created_at,
            row.updated_at,
          ],
        );
        succeeded++;
      } catch (cause) {
        errors.push(new SyncRowError('topics', row.id, cause));
      }
    }

    return { table: 'topics', succeeded, failed: errors.length, errors };
  }

  private async pullPackages(client: SupabaseClient): Promise<TableSyncResult> {
    const { data, error } = await client.from('packages').select('*').eq('status', 'PUBLISHED');
    if (error) {
      return {
        table: 'packages',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('packages', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        // bundle_path deliberately not written — omitted from the
        // local schema by design (see sqlite_schema.sql).
        await this.db.execute(
          `INSERT INTO packages (id, exam_id, package_type, difficulty_level, version, checksum, is_free_tier, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             package_type = excluded.package_type,
             difficulty_level = excluded.difficulty_level,
             version = excluded.version,
             checksum = excluded.checksum,
             is_free_tier = excluded.is_free_tier,
             status = excluded.status,
             updated_at = excluded.updated_at;`,
          [
            row.id,
            row.exam_id,
            row.package_type,
            row.difficulty_level,
            row.version,
            row.checksum,
            row.is_free_tier ? 1 : 0,
            row.status,
            row.created_at,
            row.updated_at,
          ],
        );
        succeeded++;
      } catch (cause) {
        errors.push(new SyncRowError('packages', row.id, cause));
      }
    }

    return { table: 'packages', succeeded, failed: errors.length, errors };
  }

  // Interim direct-table hydration (see PullSync.ts) — no status filter
  // beyond PUBLISHED and no client-side entitlement check: RLS
  // (questions_select_entitled / questions_select_free_tier) is the
  // only authorization layer, identical in spirit to how exams/topics/
  // packages already rely on RLS rather than a client-side rule.
  private async pullQuestions(client: SupabaseClient): Promise<TableSyncResult> {
    const { data, error } = await client.from('questions').select('*').eq('status', 'PUBLISHED');
    if (error) {
      return {
        table: 'questions',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('questions', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        await this.db.execute(
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
            row.id,
            row.exam_id,
            row.topic_id,
            row.question_type,
            row.body,
            row.revision,
            row.status,
            row.created_at,
            row.updated_at,
          ],
        );
        succeeded++;
      } catch (cause) {
        errors.push(new SyncRowError('questions', row.id, cause));
      }
    }

    return { table: 'questions', succeeded, failed: errors.length, errors };
  }

  // RLS (question_options_select_entitled / _select_free_tier) is the
  // only authorization layer — no status column of its own to filter
  // on, unlike its parent Question.
  //
  // Grouped by question_id; the clear (is_correct = 0) and every upsert
  // for that question run inside one db.transaction(), atomically: the
  // local schema's partial unique index only allows one is_correct = 1
  // row per question_id, so if which option is correct changed
  // server-side since the last pull, upserting the new correct option
  // before clearing the old one would collide with that index — and if
  // the clear succeeds but a later upsert in the same group fails, an
  // un-transacted sequence could leave that question with zero correct
  // options locally. op-sqlite's transaction() auto-commits if the
  // callback resolves and auto-rolls-back everything in it if the
  // callback throws, so a failure anywhere in a question's group
  // reverts the clear too, leaving that question exactly as it was
  // before this pull rather than in a partially-cleared state.
  private async pullQuestionOptions(client: SupabaseClient): Promise<TableSyncResult> {
    const { data, error } = await client.from('question_options').select('*');
    if (error) {
      return {
        table: 'question_options',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('question_options', '(all)', error)],
      };
    }

    const rows = data ?? [];
    const rowsByQuestionId = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = rowsByQuestionId.get(row.question_id) ?? [];
      list.push(row);
      rowsByQuestionId.set(row.question_id, list);
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];

    for (const [questionId, questionOptions] of rowsByQuestionId) {
      let failedRowId: string | null = null;

      try {
        await this.db.transaction(async (tx) => {
          await tx.execute(`UPDATE question_options SET is_correct = 0 WHERE question_id = ?;`, [
            questionId,
          ]);

          for (const row of questionOptions) {
            try {
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
            } catch (cause) {
              // Identify which row triggered the failure before
              // re-throwing — re-throwing is what makes op-sqlite roll
              // back this question's entire transaction, including the
              // clear step above.
              failedRowId = row.id;
              throw cause;
            }
          }
        });

        succeeded += questionOptions.length;
      } catch (cause) {
        errors.push(new SyncRowError('question_options', failedRowId ?? questionId, cause));
      }
    }

    return { table: 'question_options', succeeded, failed: errors.length, errors };
  }

  // RLS (package_questions_select_entitled / _select_free_tier) is the
  // only authorization layer. Composite-keyed (package_id, question_id),
  // no id/updated_at column of its own.
  private async pullPackageQuestions(client: SupabaseClient): Promise<TableSyncResult> {
    const { data, error } = await client.from('package_questions').select('*');
    if (error) {
      return {
        table: 'package_questions',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('package_questions', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        await this.db.execute(
          `INSERT INTO package_questions (package_id, question_id, display_order, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (package_id, question_id) DO UPDATE SET
             display_order = excluded.display_order;`,
          [row.package_id, row.question_id, row.display_order, row.created_at],
        );
        succeeded++;
      } catch (cause) {
        errors.push(
          new SyncRowError('package_questions', `${row.package_id}:${row.question_id}`, cause),
        );
      }
    }

    return { table: 'package_questions', succeeded, failed: errors.length, errors };
  }

  // trial_access (Phase 2B.4) — scoped to this user's own rows, same
  // shape as pullEntitlements. Rows are immutable once created (no
  // columns to update beyond the ones already set at insert), so this
  // is DO NOTHING on conflict, matching pullPackageAccess's own upsert
  // rather than pullEntitlements'/pullExams' DO UPDATE style.
  private async pullTrialAccess(client: SupabaseClient, userId: string): Promise<TableSyncResult> {
    const { data, error } = await client.from('trial_access').select('*').eq('user_id', userId);
    if (error) {
      return {
        table: 'trial_access',
        succeeded: 0,
        failed: 1,
        errors: [new SyncRowError('trial_access', '(all)', error)],
      };
    }

    let succeeded = 0;
    const errors: SyncRowError[] = [];
    for (const row of data ?? []) {
      try {
        await this.db.execute(
          `INSERT INTO trial_access (id, user_id, question_id, package_id, granted_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING;`,
          [row.id, row.user_id, row.question_id, row.package_id, row.granted_at, row.created_at],
        );
        succeeded++;
      } catch (cause) {
        errors.push(new SyncRowError('trial_access', row.id, cause));
      }
    }

    return { table: 'trial_access', succeeded, failed: errors.length, errors };
  }
}
