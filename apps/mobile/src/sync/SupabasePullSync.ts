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
//
// Fifth (Phase 7A.2, corrected 7A.2.1 and 7A.2.2): content is no longer
// pulled as three flat, whole-table queries. pullPackageContent() below
// considers only packages this user currently has full access to —
// is_free_tier, or (only when this cycle's entitlements/package_access
// pulls both actually succeeded — see below) an ACTIVE entitlement's
// package_access row for this user — and, via the device-local
// content_sync_state table (see sqlite_schema.sql), skips re-fetching a
// full-access package's questions/question_options/package_questions
// when the server's current packages.version/checksum for that package
// already matches what was recorded last time. A package the user does
// not currently have full access to is skipped entirely: no network
// call, and content_sync_state is never written or updated for it — RLS
// can legitimately return zero package_questions for a locked package,
// and recording that as "synced" would make the package stay skipped
// forever once access is later granted, unless its version/checksum
// also happened to change. Trial-only access (Phase 2B.4) does not
// count as full access here; it stays lazy through TrialGrantSync, not
// this pipeline. A package that is new or changed is fetched and
// written — questions, then question_options, then package_questions,
// then content_sync_state, in that FK-safe order — in one op-sqlite
// transaction, so a failure partway through never leaves
// content_sync_state claiming a version/checksum whose rows didn't
// actually make it in, and a fresh device with no local rows yet never
// violates package_questions' FK to questions.
//
// pull() only calls pullPackageContent when this cycle's packages pull
// (packagesResult) itself succeeded, and only tells it entitlement-only
// packages are eligible when this cycle's entitlements and
// package_access pulls both also succeeded (accessMetadataFresh). Local
// packages/entitlements/package_access rows persist across pulls, so
// "this ran after pullPackages/pullEntitlements/pullPackageAccess in the
// sequence" does not by itself mean those local rows reflect anything
// current — only a pull that succeeded this cycle guarantees that. If
// packagesResult failed, local packages.version/checksum could be
// stale, and content sync is skipped entirely rather than comparing
// against a value that isn't known to be current. If entitlements/
// package_access failed, a stale local ACTIVE entitlement could make a
// now-locked package look full-access; accessMetadataFresh being false
// prevents that branch of the access check from being used at all,
// leaving only is_free_tier packages eligible that cycle.

// Supabase/PostgREST caps any single response at 1000 rows by default
// (db-max-rows) — silently, not as an error: a query matching more rows
// than that simply returns the first page with no indication anything
// was left out. At current draft-content volume, every table here
// stays well under that, but questions/question_options/
// package_questions will not once real content is imported (Phase
// 7A.0 audit). PAGE_SIZE is set below Supabase's default 1000-row cap,
// not at it — but that margin only holds while this project's
// db-max-rows setting stays at least PAGE_SIZE. If db-max-rows is ever
// lowered below PAGE_SIZE, a page could itself be silently truncated
// (fetchAllPages would then misread a truncated page as "last page"
// once its length is short, without knowing it was truncated rather
// than genuinely final) — that would need revisiting with either
// exact-count detection (e.g. reading the response's Content-Range
// total) or a smaller PAGE_SIZE, not assumed away by this comment.
const PAGE_SIZE = 500;

// Separate concern from PAGE_SIZE/.range() row pagination: an
// .in('id', questionIds) filter puts every id directly into the
// PostgREST request URL, not just the response. A package with
// hundreds of questions could produce a URL long enough to be rejected
// before the request even reaches row pagination. pullPackageContent
// splits questionIds into chunks of this size and issues one filtered
// (still separately row-paginated via fetchAllPages) query per chunk.
const QUESTION_ID_FILTER_CHUNK_SIZE = 100;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export class SupabasePullSync implements PullSync {
  constructor(
    private readonly client: SupabaseClient | null,
    private readonly db: DB,
    private readonly authService: AuthService,
  ) {}

  // Pages through a query via .range(), accumulating every page into one
  // array. `buildQuery` must already carry every filter/order this call
  // needs (including .order(...), required for .range() to paginate
  // deterministically) — this helper only ever supplies the range
  // itself, calling buildQuery again with the next window until a page
  // comes back shorter than PAGE_SIZE (the signal there's no next page).
  //
  // If any page errors, the whole call fails and returns { data: null,
  // error } immediately, discarding rows already accumulated from
  // earlier successful pages in this same call — a table is either
  // fetched in full or not upserted at all this pull, never partially.
  private async fetchAllPages(
    buildQuery: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: unknown }>,
  ): Promise<{ data: any[] | null; error: unknown }> {
    const allRows: any[] = [];
    let from = 0;

    for (;;) {
      const to = from + PAGE_SIZE - 1;
      const { data, error } = await buildQuery(from, to);
      if (error) {
        return { data: null, error };
      }

      const page = data ?? [];
      allRows.push(...page);

      if (page.length < PAGE_SIZE) {
        return { data: allRows, error: null };
      }
      from += PAGE_SIZE;
    }
  }

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
    //
    // Several results are kept in named variables, not just pushed
    // straight into the tables array, because pullPackageContent below
    // needs to inspect whether packagesResult/entitlementsResult/
    // packageAccessResult actually succeeded this cycle — not merely
    // that they ran earlier in the list. A prior pull could have left
    // locally-stored packages.version/checksum or entitlements/
    // package_access rows that are now stale if this cycle's refresh of
    // any of them failed (e.g. a transient network error on just that
    // one call); pullPackageContent must not treat those stale local
    // rows as current (see its own doc-comment for what goes wrong if it
    // does).
    const userProfileResult = await this.pullUserProfile(client, userId);
    const examsResult = await this.pullExams(client);
    const topicsResult = await this.pullTopics(client);
    const packagesResult = await this.pullPackages(client);
    const entitlementsResult = await this.pullEntitlements(client, userId);
    const packageAccessResult = await this.pullPackageAccess(client, userId);

    // Interim content hydration (see PullSync.ts / class doc-comment
    // above) — questions require exams/topics (already pulled);
    // package_questions requires packages (already pulled). Per-package,
    // cache-skip-aware, and gated to full-access packages only — see the
    // fifth known limitation/note above. Skipped entirely, without
    // touching content_sync_state, if this cycle's packages pull failed:
    // local packages.version/checksum could then be stale, and content
    // sync must never be gated on a version/checksum that isn't known to
    // be current. See pullPackageContent's own doc-comment for how
    // accessMetadataFresh (derived from entitlementsResult/
    // packageAccessResult below) further restricts which packages are
    // even considered.
    const contentResults: TableSyncResult[] =
      packagesResult.failed === 0
        ? await this.pullPackageContent(
            client,
            userId,
            entitlementsResult.failed === 0 && packageAccessResult.failed === 0,
          )
        : [
            { table: 'questions', succeeded: 0, failed: 0, errors: [] },
            { table: 'question_options', succeeded: 0, failed: 0, errors: [] },
            { table: 'package_questions', succeeded: 0, failed: 0, errors: [] },
          ];

    // trial_access last — see the fourth known limitation above.
    const trialAccessResult = await this.pullTrialAccess(client, userId);

    const tables = [
      userProfileResult,
      examsResult,
      topicsResult,
      packagesResult,
      entitlementsResult,
      packageAccessResult,
      ...contentResults,
      trialAccessResult,
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
    const { data, error } = await this.fetchAllPages((from, to) =>
      client
        .from('exams')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('id', { ascending: true })
        .range(from, to),
    );
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
    const { data, error } = await this.fetchAllPages((from, to) =>
      client
        .from('topics')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('id', { ascending: true })
        .range(from, to),
    );
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
    const { data, error } = await this.fetchAllPages((from, to) =>
      client
        .from('packages')
        .select('*')
        .eq('status', 'PUBLISHED')
        .order('id', { ascending: true })
        .range(from, to),
    );
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
        // title/description (Phase 7A.3.2, hardened 7A.3.2.1) and
        // topic_id (Phase 8A.2): `?? null` guards against select('*')
        // returning rows without these keys at all, which happens if
        // this device's Supabase project hasn't had the corresponding
        // migration applied yet — `row.title`/`row.topic_id` would then
        // be `undefined`, and op-sqlite has no defined binding behavior
        // for that the way it does for `null`.
        await this.db.execute(
          `INSERT INTO packages (id, exam_id, package_type, difficulty_level, version, checksum, is_free_tier, status, title, description, topic_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             package_type = excluded.package_type,
             difficulty_level = excluded.difficulty_level,
             version = excluded.version,
             checksum = excluded.checksum,
             is_free_tier = excluded.is_free_tier,
             status = excluded.status,
             title = excluded.title,
             description = excluded.description,
             topic_id = excluded.topic_id,
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
            row.title ?? null,
            row.description ?? null,
            row.topic_id ?? null,
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

  // Per-package content pull (Phase 7A.2, corrected 7A.2.1 and 7A.2.2),
  // replacing three flat whole-table queries with a per-package
  // skip/fetch decision driven by content_sync_state (see
  // sqlite_schema.sql). No status filter on package_questions/
  // question_options beyond what RLS already enforces (questions is
  // filtered to PUBLISHED, matching the prior flat query;
  // package_questions/question_options have no status column of their
  // own, identical to before) — client-side authorization logic is not
  // added on top of RLS here any more than it was before this phase,
  // beyond the full-access gate below, which exists to protect
  // content_sync_state's correctness, not to enforce access (RLS
  // already does that).
  //
  // Callers must only invoke this once this cycle's packages pull has
  // succeeded (pull() only calls this when packagesResult.failed === 0)
  // — local packages.version/checksum are the values content_sync_state
  // gets compared against and written with, so they must be known
  // current this cycle, not merely "current as of some earlier pull."
  //
  // `accessMetadataFresh` (7A.2.2) is likewise supplied by the caller,
  // not derived here, and must reflect whether *this cycle's*
  // pullEntitlements/pullPackageAccess both succeeded — not simply that
  // they ran earlier in pull()'s sequence. Local entitlements/
  // package_access rows persist across cycles, so if either pull failed
  // this time (e.g. a transient network error), those local rows could
  // be stale: a since-revoked ACTIVE entitlement or an already-removed
  // package_access row would still be sitting there unchanged. Treating
  // that stale data as current could make a locked package look
  // full-access, in which case RLS would legitimately return zero
  // package_questions for it, and content_sync_state would end up
  // written with question_count = 0 — indistinguishable from "this
  // package genuinely has no questions," and wrongly persistent even
  // after the user is later actually granted access, unless
  // version/checksum also happens to change. When accessMetadataFresh is
  // false, only is_free_tier packages are considered; every
  // entitlement-only package is skipped with no network call and no
  // content_sync_state write/update, exactly like a genuinely locked
  // package is.
  //
  // For a full-access package whose local content_sync_state.
  // synced_version/synced_checksum already match packages.version/
  // checksum, the package is skipped entirely: no network call, no
  // local write. This is the cache-skip design from the Phase 7A.0
  // audit — packages.version is bumped by editorial tooling whenever a
  // package's question set changes, so an unchanged version/checksum is
  // treated as "content already up to date."
  //
  // For a full-access package that is new or has changed, its
  // package_questions, matching questions, and matching question_options
  // are fetched, then written together with the content_sync_state row
  // in a single db.transaction(), in FK-safe order — questions first
  // (package_questions.question_id references questions(id); a fresh
  // device has no local questions row yet), then question_options, then
  // package_questions, then content_sync_state last. This is the same
  // all-or-nothing guarantee the prior per-question option transaction
  // relied on, just scoped to the whole package instead of one question:
  // if anything in the callback throws, op-sqlite rolls back everything
  // in it, so content_sync_state is never left claiming a
  // version/checksum whose rows didn't actually land locally. A network
  // fetch failure (package_questions/questions/question_options), or a
  // questions result short of the package_questions question_id count
  // (see the count check below), short-circuits before the transaction
  // even starts, for the same reason.
  //
  // Per Phase 7A.2 scope: no stale-row cleanup here either — a question
  // dropped from a package server-side, or a package no longer
  // PUBLISHED or no longer full-access, is not deleted locally. That gap
  // is unchanged from the prior flat-pull implementation, not newly
  // introduced.
  private async pullPackageContent(
    client: SupabaseClient,
    userId: string,
    accessMetadataFresh: boolean,
  ): Promise<TableSyncResult[]> {
    const questionsResult: TableSyncResult = { table: 'questions', succeeded: 0, failed: 0, errors: [] };
    const optionsResult: TableSyncResult = {
      table: 'question_options',
      succeeded: 0,
      failed: 0,
      errors: [],
    };
    const packageQuestionsResult: TableSyncResult = {
      table: 'package_questions',
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    // Full-access packages only: free tier always qualifies, since
    // is_free_tier is content policy, not access metadata that this
    // cycle's pulls could have left stale. The entitlement/package_access
    // branch only qualifies a package when accessMetadataFresh is true —
    // when it's false, that branch is skipped outright (short-circuited
    // via the `? = 1` guard below) rather than trusting whatever
    // entitlements/package_access rows happen to already be stored
    // locally from a possibly-earlier, now-stale pull. Trial-only access
    // does not appear here at all — trial_access has no bearing on this
    // EXISTS clause, fresh or not.
    const localPackagesResult = await this.db.execute(
      `SELECT p.id, p.version, p.checksum
       FROM packages p
       WHERE p.status = 'PUBLISHED'
         AND (
           p.is_free_tier = 1
           OR (
             ? = 1
             AND EXISTS (
               SELECT 1
               FROM package_access pa
               JOIN entitlements e ON e.id = pa.entitlement_id
               WHERE pa.package_id = p.id
                 AND e.user_id = ?
                 AND e.status = 'ACTIVE'
             )
           )
         );`,
      [accessMetadataFresh ? 1 : 0, userId],
    );
    const localPackages = localPackagesResult.rows as unknown as Array<{
      id: string;
      version: number;
      checksum: string | null;
    }>;

    for (const pkg of localPackages) {
      const stateRowResult = await this.db.execute(
        `SELECT synced_version, synced_checksum FROM content_sync_state WHERE package_id = ?;`,
        [pkg.id],
      );
      const stateRow = (
        stateRowResult.rows as unknown as Array<{
          synced_version: number;
          synced_checksum: string | null;
        }>
      )[0];

      if (
        stateRow &&
        stateRow.synced_version === pkg.version &&
        (stateRow.synced_checksum ?? null) === (pkg.checksum ?? null)
      ) {
        continue;
      }

      const { data: packageQuestionsData, error: packageQuestionsError } = await this.fetchAllPages(
        (from, to) =>
          client
            .from('package_questions')
            .select('*')
            .eq('package_id', pkg.id)
            .order('question_id', { ascending: true })
            .range(from, to),
      );
      if (packageQuestionsError) {
        packageQuestionsResult.failed++;
        packageQuestionsResult.errors.push(
          new SyncRowError('package_questions', pkg.id, packageQuestionsError),
        );
        continue;
      }
      const packageQuestions = packageQuestionsData ?? [];
      const questionIds = [...new Set(packageQuestions.map((row) => row.question_id as string))];

      let questions: any[] = [];
      let options: any[] = [];

      if (questionIds.length > 0) {
        // Chunked, not one .in(...questionIds) call — see
        // QUESTION_ID_FILTER_CHUNK_SIZE's comment above. Each chunk is
        // still separately row-paginated via fetchAllPages; chunking and
        // row pagination are independent concerns (URL/filter size vs.
        // response row count) and both apply here.
        const idChunks = chunkArray(questionIds, QUESTION_ID_FILTER_CHUNK_SIZE);

        let questionsChunkError: unknown = null;
        for (const idChunk of idChunks) {
          const { data: questionsData, error: questionsError } = await this.fetchAllPages(
            (from, to) =>
              client
                .from('questions')
                .select('*')
                .eq('status', 'PUBLISHED')
                .in('id', idChunk)
                .order('id', { ascending: true })
                .range(from, to),
          );
          if (questionsError) {
            questionsChunkError = questionsError;
            break;
          }
          questions.push(...(questionsData ?? []));
        }
        if (questionsChunkError) {
          // Any chunk failing fails the whole package: partial question
          // data is not written, so the transaction below is never
          // reached and content_sync_state is left untouched for it.
          questionsResult.failed++;
          questionsResult.errors.push(new SyncRowError('questions', pkg.id, questionsChunkError));
          continue;
        }

        // Set-based, not a length comparison — robust across chunk
        // boundaries. package_questions named question ids that
        // questions did not actually return (e.g. one was unpublished
        // but its package_questions row wasn't cleaned up server-side
        // yet). Writing package_questions for an id with no local
        // questions row would violate the FK; caught here explicitly
        // rather than left to surface only as an FK failure inside the
        // transaction.
        const fetchedQuestionIds = new Set(questions.map((row) => row.id as string));
        const missingQuestionIds = questionIds.filter((id) => !fetchedQuestionIds.has(id));
        if (missingQuestionIds.length > 0) {
          questionsResult.failed++;
          questionsResult.errors.push(
            new SyncRowError(
              'questions',
              pkg.id,
              new Error(
                `Package ${pkg.id}: package_questions referenced ${questionIds.length} question id(s), ${missingQuestionIds.length} did not come back from questions`,
              ),
            ),
          );
          continue;
        }

        let optionsChunkError: unknown = null;
        for (const idChunk of idChunks) {
          const { data: optionsData, error: optionsError } = await this.fetchAllPages((from, to) =>
            client
              .from('question_options')
              .select('*')
              .in('question_id', idChunk)
              .order('id', { ascending: true })
              .range(from, to),
          );
          if (optionsError) {
            optionsChunkError = optionsError;
            break;
          }
          options.push(...(optionsData ?? []));
        }
        if (optionsChunkError) {
          // Same as above: a failed chunk fails the whole package before
          // the transaction starts, so content_sync_state is not written.
          optionsResult.failed++;
          optionsResult.errors.push(new SyncRowError('question_options', pkg.id, optionsChunkError));
          continue;
        }

        // Every fetched question must have at least 2 option rows and
        // exactly 1 marked correct before this package can be marked
        // synced — catches a question whose options are missing or
        // malformed, the same class of problem the questionIds mismatch
        // check above catches for questions themselves. Deliberately not
        // an exact count (not "must have 4" or "must have 5"): smoke
        // data uses 4 options, real imported content may use 5 — the
        // only invariant that must hold either way is >= 2 options with
        // exactly 1 correct.
        const optionsByQuestionForCheck = new Map<string, typeof options>();
        for (const row of options) {
          const list = optionsByQuestionForCheck.get(row.question_id) ?? [];
          list.push(row);
          optionsByQuestionForCheck.set(row.question_id, list);
        }
        const incompleteQuestionIds = questionIds.filter((id) => {
          const questionOptions = optionsByQuestionForCheck.get(id) ?? [];
          const correctCount = questionOptions.filter((row) => Boolean(row.is_correct)).length;
          return questionOptions.length < 2 || correctCount !== 1;
        });
        if (incompleteQuestionIds.length > 0) {
          optionsResult.failed++;
          optionsResult.errors.push(
            new SyncRowError(
              'question_options',
              pkg.id,
              new Error(
                `Package ${pkg.id}: ${incompleteQuestionIds.length} question(s) have incomplete options (need >= 2 options and exactly 1 correct)`,
              ),
            ),
          );
          continue;
        }
      }

      try {
        await this.db.transaction(async (tx) => {
          // FK-safe order: questions before question_options (options
          // reference questions(id)) and before package_questions
          // (package_questions.question_id also references questions(id)
          // — on a fresh device with no local rows yet, inserting
          // package_questions first would fail before the question row
          // exists). content_sync_state last, since it is the record
          // that this package's content landed successfully.
          for (const row of questions) {
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
          }

          const optionsByQuestionId = new Map<string, typeof options>();
          for (const row of options) {
            const list = optionsByQuestionId.get(row.question_id) ?? [];
            list.push(row);
            optionsByQuestionId.set(row.question_id, list);
          }
          for (const [questionId, questionOptions] of optionsByQuestionId) {
            await tx.execute(`UPDATE question_options SET is_correct = 0 WHERE question_id = ?;`, [
              questionId,
            ]);
            for (const row of questionOptions) {
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
          }

          for (const row of packageQuestions) {
            await tx.execute(
              `INSERT INTO package_questions (package_id, question_id, display_order, created_at)
               VALUES (?, ?, ?, ?)
               ON CONFLICT (package_id, question_id) DO UPDATE SET
                 display_order = excluded.display_order;`,
              [row.package_id, row.question_id, row.display_order, row.created_at],
            );
          }

          await tx.execute(
            `INSERT INTO content_sync_state (package_id, synced_version, synced_checksum, question_count, synced_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (package_id) DO UPDATE SET
               synced_version = excluded.synced_version,
               synced_checksum = excluded.synced_checksum,
               question_count = excluded.question_count,
               synced_at = excluded.synced_at;`,
            [pkg.id, pkg.version, pkg.checksum, questions.length, new Date().toISOString()],
          );
        });

        packageQuestionsResult.succeeded += packageQuestions.length;
        questionsResult.succeeded += questions.length;
        optionsResult.succeeded += options.length;
      } catch (cause) {
        // Whichever table's row data caused the throw, the entire
        // package's transaction rolled back together — reported against
        // package_questions since that is this package's anchor query,
        // not split across all three tables for one shared cause.
        packageQuestionsResult.failed++;
        packageQuestionsResult.errors.push(new SyncRowError('package_questions', pkg.id, cause));
      }
    }

    return [questionsResult, optionsResult, packageQuestionsResult];
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
