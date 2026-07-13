# Physical Database Schema — EKYS CEPTE

Status: Approved (2026-07-02)

## Purpose
The physical schema translating the approved Conceptual Database Model
(`CONCEPTUAL_DATABASE_MODEL.md`) into concrete PostgreSQL and SQLite table
designs — reviewed and approved group-by-group (Content, User/Access,
Activity, Derived/Analytics).

**This document is a schema specification. It precedes SQL migrations; it
is not itself runnable DDL.**

## Conventions
UUID primary keys · snake_case naming · `created_at`/`updated_at` standard
audit pair · TEXT + CHECK preferred over native ENUM types for
extensibility · every table RLS-enabled, fail-closed, from its first
migration · SQLite mirrors PostgreSQL structurally except where explicitly
noted (local-only `synced_at` columns).

---

## Group 1 — Content Model

### `exams`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| name | text | No | — | |
| status | text | No | `'DRAFT'` | CHECK: DRAFT/INTERNAL/BETA/PUBLISHED/ARCHIVED |
| question_count | integer | No | — | CHECK > 0 |
| duration_minutes | integer | No | — | CHECK > 0 |
| passing_score | numeric | No | — | CHECK >= 0 |
| supersedes_exam_id | UUID | Yes | NULL | FK → exams.id, SET NULL, informational-only |
| created_at / updated_at | timestamptz | No | now() | |

Indexes: `status`. RLS: Published broadly readable, Draft/Internal/Beta =
Editorial CMS only; write = Editorial CMS only. Sync: Server→Client,
Published only.

### `topics`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| exam_id | UUID | No | — | FK → exams.id, RESTRICT |
| parent_topic_id | UUID | Yes | NULL | FK → topics.id, SET NULL |
| name | text | No | — | |
| display_order | integer | No | **none — explicitly assigned by Editorial CMS** | |
| status | text | No | `'DRAFT'` | CHECK: DRAFT/PUBLISHED/ARCHIVED |
| created_at / updated_at | timestamptz | No | now() | |

Indexes: `exam_id`; `parent_topic_id`; `(exam_id, display_order)`.
Integrity (app/trigger-level): parent must share `exam_id`. RLS/Sync: same
pattern as Exam.

### `questions`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| exam_id | UUID | No | — | FK → exams.id, RESTRICT |
| topic_id | UUID | No | — | FK → topics.id, RESTRICT |
| question_type | text | No | `'SINGLE_CHOICE'` | CHECK: SINGLE_CHOICE only (MVP) |
| body | text | No | — | |
| revision | integer | No | 1 | |
| status | text | No | `'DRAFT'` | CHECK: DRAFT/PUBLISHED/ARCHIVED |
| created_at / updated_at | timestamptz | No | now() | |

Indexes: `topic_id`; `exam_id`; `status`. Integrity: `topic_id`'s exam must
equal own `exam_id`. RLS: most restrictive — entitlement-gated (free-tier
exception), write = Editorial CMS only. Sync: bundled inside Package
downloads.

### `question_options`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| question_id | UUID | No | — | FK → questions.id, CASCADE |
| label | char(1) (PG) / text, length 1 (SQLite) | No | — | CHECK: single uppercase letter, A–E range |
| body | text | No | — | |
| is_correct | boolean | No | false | |
| display_order | integer | No | **none — explicitly assigned by Editorial CMS** | |
| created_at | timestamptz | No | now() | |

Constraint: partial unique index `(question_id) WHERE is_correct = true` —
enforces exactly one correct option (mechanism proposed, final SQL form
deferred). RLS: mirrors Question, independently policed. Sync: bundled
with Question.

### `packages`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| exam_id | UUID | No | — | FK → exams.id, RESTRICT |
| package_type | text | No | — | CHECK: TEMEL_CALISMA/YOGUN_TEKRAR/ZORLAYICI_DENEME |
| difficulty_level | text | No | — | CHECK: KOLAY/ORTA/ZOR |
| version | integer | No | 1 | CHECK > 0 |
| checksum | text | Yes | NULL | |
| bundle_path | text | Yes | NULL | Stable storage object path only — signed URLs are runtime-generated and must never be stored |
| is_free_tier | boolean | No | `false` | Added 2026-07-02. Policy decision, not a license — free-tier access never goes through Entitlement/PackageAccess. package_type remains a study-mode descriptor only, not overloaded to also mean pricing tier. |
| status | text | No | `'DRAFT'` | CHECK: DRAFT/PUBLISHED/ARCHIVED |
| created_at / updated_at | timestamptz | No | now() | |

Indexes: `exam_id`; `(exam_id, package_type, difficulty_level)`. RLS:
metadata broadly readable if Exam Published; bundle content gated
separately via signed-URL issuance (Entitlement/PackageAccess-checked),
not by table RLS alone. Sync: metadata Server→Client; bundle via
signed-URL download flow.

### `package_questions`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| package_id | UUID | No | — | PK (composite), FK → packages.id, CASCADE |
| question_id | UUID | No | — | PK (composite), FK → questions.id, CASCADE |
| display_order | integer | No | **none — explicitly assigned by Editorial CMS** | |
| created_at | timestamptz | No | now() | |

Integrity: Package/Question must share `exam_id`. Indexes: composite PK;
secondary on `question_id`. RLS/Sync: mirrors Package.

---

## Group 2 — User / Access Model

### `user_profiles`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | — | PK, FK → `auth.users.id`, CASCADE |
| account_status | text | No | — | CHECK: ANONYMOUS/REGISTERED only |
| created_at / updated_at | timestamptz | No | now() | |

RLS: self-access-only. Sync: Server→Client, own profile only.

### `entitlements`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| user_id | UUID | No | — | FK → user_profiles.id, RESTRICT |
| exam_id | UUID | No | — | FK → exams.id, RESTRICT |
| status | text | No | `'ACTIVE'` | CHECK: ACTIVE/PENDING/REVOKED/EXPIRED/RESTORED |
| source | text | No | — | CHECK: APPLE/GOOGLE/ADMIN/PROMOTION |
| granted_at | timestamptz | No | now() | |
| expires_at | timestamptz | Yes | null | |
| created_at / updated_at | timestamptz | No | now() | |

RESTRICT is a deliberate architectural stance: identity deletion must not
be possible while Entitlement records exist (durable purchase/legal
record). REFUNDED represented as REVOKED; reason deferred to future
audit/history mechanism. `expires_at = null` is reserved for legacy/admin/
lifetime grants; timed Premium access must also satisfy `expires_at > now()`.
Indexes: `(user_id, exam_id)`; `exam_id`; `(user_id, status, expires_at)`. RLS:
read self-scoped; write server-only, no client path at all. Sync:
Server→Client, High priority.

### `package_access`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| entitlement_id | UUID | No | — | PK (composite), FK → entitlements.id, CASCADE |
| package_id | UUID | No | — | PK (composite), FK → packages.id, RESTRICT |
| created_at | timestamptz | No | now() | |

Integrity: Package/Entitlement must share `exam_id`. RLS/Sync: mirrors
Entitlement (server-only write).

**No `exam_access` table** — free-tier access is policy-based.

### `trial_access` — added 2026-07-06 (Phase 2B.4)
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| user_id | UUID | No | — | FK → user_profiles.id, RESTRICT |
| question_id | UUID | No | — | FK → questions.id, RESTRICT |
| package_id | UUID | No | — | FK → packages.id, RESTRICT |
| granted_at | timestamptz | No | now() | |
| created_at | timestamptz | No | now() | |

Unique constraint: `(user_id, question_id)` — one grant per question per
user, regardless of which package it's requested against. **`package_id`
is the package checked for eligibility at `INSERT` time only — the
grant source, not a permanent read-scope** (corrected 2026-07-06, Phase
2B.4B.2.1; see below). Indexes:
`user_id`; `package_id`. Integrity (`BEFORE INSERT` trigger,
`SECURITY DEFINER`, `search_path` pinned to `public`): question must
belong to package via `package_questions`; question must be
`PUBLISHED`; package must be `PUBLISHED`, `is_free_tier = false`, and
`package_type != 'ZORLAYICI_DENEME'`; a repeat grant for an
already-held `(user_id, question_id)` short-circuits before any other
check (idempotent, never fails on an exhausted cap); cap of 100 total
rows per `user_id`, counted under a `pg_advisory_xact_lock` keyed on
`user_id` to close the concurrent-request race window. RLS: self-scoped
select/insert only (`user_id = auth.uid()`); no update/delete policy —
grants are permanent. Additive content-read policies:
`questions_select_trial`, `question_options_select_trial`,
`package_questions_select_trial` — **not** a plain mirror of the
`_entitled`/`_free_tier` policies. Two corrections were made after the
original version:
- **(2026-07-06, first correction):** grant eligibility was checked once,
  at `INSERT` time, by the trigger, but a package can be unpublished/
  archived or reclassified afterward — so every trial SELECT policy
  re-verifies *current* package eligibility (`packages.status =
  'PUBLISHED'`, `is_free_tier = false`, `package_type !=
  'ZORLAYICI_DENEME'`) and *current* `package_questions` membership on
  every read, not just at grant time.
- **(2026-07-06, second correction, Phase 2B.4B.2.1):** the first
  correction still bound that re-check to the *specific* `package_id`
  recorded on the grant row, which contradicted `trial_access`'s own
  per-question model (`package_questions` is a true many-to-many
  relationship — a granted question can legitimately belong to more
  than one package). Read visibility is now keyed purely by
  `(user_id, question_id)` plus a currently-eligible package reached
  through *any* current `package_questions` membership — not
  specifically the one on the grant row. A grant remains visible through
  every eligible package the question currently belongs to, not only
  the one it happened to be requested through.
Sync: Server→Client, bundled with the interim `questions`/
`question_options`/`package_questions` hydration pull, pulled last in
that sequence (see `apps/mobile/src/sync/SupabasePullSync.ts`).

### `trial_candidate_questions` (view) — added 2026-07-06 (Phase 2B.4B.1)
Not a table — a view over `package_questions` joined to `packages` and
`questions`, exposing only `package_id, question_id, display_order`.
Closes a real gap in the `trial_access` design: RLS gives a
non-entitled, non-free-tier client no way to discover a candidate
`question_id` to request a grant for, since `questions_select_trial`/
`question_options_select_trial`/`package_questions_select_trial` all
require a grant to already exist. Defined `WITH (security_invoker =
false, security_barrier = true)` — deliberately bypasses the
`package_questions`/`questions`/`packages` RLS those base tables carry
(the opposite choice from `repeat_pool`'s `security_invoker = true`,
since this view is structural/non-per-user data, not per-user activity
data), and `security_barrier` prevents a client-supplied PostgREST
filter from being planner-pushed ahead of the view's own qualification.
Same `WHERE` predicate as `check_trial_access_grant()`'s eligibility
checks (published package, non-free-tier, non-`ZORLAYICI_DENEME`,
published question) — never exposes question body, options, correct
answers, or any entitlement/access data. Grants: `REVOKE ALL ... FROM
public, anon, authenticated` then `GRANT SELECT ... TO authenticated`
explicitly (not assumed from Supabase's project-level defaults). Grant
creation is unaffected — still exclusively a direct `trial_access`
INSERT validated by the existing trigger; this view only supplies the
`question_id` input to that INSERT.

---

## Group 3 — Activity Model

### `attempts`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | client-generated | PK — also the idempotency key |
| user_id | UUID | No | — | FK → user_profiles.id, RESTRICT |
| exam_id | UUID | No | — | FK → exams.id, RESTRICT |
| question_id | UUID | No | — | FK → questions.id, RESTRICT |
| exam_session_id | UUID | Yes | NULL | FK → exam_sessions.id, SET NULL |
| sequence | integer | Conditional | NULL | Required iff exam_session_id set (CHECK) |
| selected_option_id | UUID | No | — | FK → question_options.id, RESTRICT |
| is_correct | boolean | No | — | Client-computed |
| server_verified_correct | boolean | Yes | NULL | Server-only, append-only write |
| server_verified_at | timestamptz | Yes | NULL | Server-only, append-only write |
| answered_at | timestamptz | No | — | |
| created_at / updated_at | timestamptz | No | now() | |
| synced_at *(SQLite only)* | timestamptz | Yes | NULL | |

Indexes: `(user_id, exam_id, question_id, answered_at DESC)` — Repeat Pool
derivation; `exam_session_id`; `(user_id, exam_id)`. RLS: client INSERT
only, never UPDATE/DELETE. Corrections = new rows. Server verification is
a narrow, non-client-reachable, append-only exception. Sync: Client→Server,
incremental, idempotent, Medium priority.

### `exam_sessions`
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | client-generated | PK — idempotency key |
| user_id | UUID | No | — | FK → user_profiles.id, RESTRICT |
| exam_id | UUID | No | — | FK → exams.id, RESTRICT |
| package_id | UUID | No | — | FK → packages.id, RESTRICT |
| status | text | No | `'IN_PROGRESS'` | CHECK: IN_PROGRESS/COMPLETED/ABANDONED |
| started_at | timestamptz | No | — | |
| completed_at | timestamptz | Yes | NULL | |
| score | numeric | Yes | NULL | |
| passed | boolean | Yes | NULL | |
| created_at / updated_at | timestamptz | No | now() | |
| synced_at *(SQLite only)* | timestamptz | Yes | NULL | |

Explicit state machine: `IN_PROGRESS → COMPLETED`, `IN_PROGRESS →
ABANDONED` only — both terminal, no reversal. Constraint: `status !=
'COMPLETED' OR completed_at IS NOT NULL`. Indexes: `(user_id, exam_id)`;
`status`. RLS: client INSERT and UPDATE, self-scoped. Sync: at creation
(queued/background) and again on completion/update.

Server-enforced (Phase 3B.3.3, `20260706000006_harden_exam_sessions.sql`),
in addition to RLS's self-scoping: a `BEFORE INSERT` trigger
(`check_exam_session_package_eligibility`) rejects the insert unless
`package_id` belongs to `exam_id`, the package is `PUBLISHED` and
`ZORLAYICI_DENEME`, the exam is `PUBLISHED`, and the user has access
(`packages.is_free_tier` or an `ACTIVE` entitlement via
`package_access`) — mirroring the client-side check already added to
`StartExamSessionUseCase` (Phase 3B.3.1). `id`/`user_id`/`exam_id`/
`package_id`/`started_at`/`created_at` are immutable after creation
(enforced in `check_exam_session_status_transition`, alongside the
existing status state machine) — `updated_at` is deliberately excluded
from that list, since it is maintained by the existing
`set_updated_at` trigger and is expected to change on every update. A
partial unique index, `uq_exam_sessions_one_active_per_user_exam` on
`(user_id, exam_id) WHERE status = 'IN_PROGRESS'`, guarantees at most
one active session per (user, exam), race-free.

---

## Group 4 — Derived / Analytics Model

### `learning_metrics` — current cached state, not a time series
| Column | Type | Null | Default | Key |
|---|---|---|---|---|
| id | UUID | No | generated | PK |
| user_id | UUID | No | — | FK → user_profiles.id, RESTRICT |
| exam_id | UUID | No | — | FK → exams.id, RESTRICT |
| topic_id | UUID | Yes | NULL | FK → topics.id, RESTRICT |
| metric_type | text | No | — | Simple strongly-typed value; exact enforcement deferred to SQL phase |
| value | numeric | No | — | |
| computed_from | timestamptz | Yes | NULL | Basis range start |
| computed_to | timestamptz | Yes | NULL | Basis range end |
| computed_at | timestamptz | No | now() | Updated on each recomputation |
| created_at / updated_at | timestamptz | No | now() | |
| synced_at *(SQLite only)* | timestamptz | Yes | NULL | |

Unique constraint: `(user_id, exam_id, topic_id, metric_type)` — exactly
one current row per metric key; recomputation upserts. No `metric_types`
reference table in MVP — may be introduced later, non-breakingly. Indexes:
the unique constraint itself. RLS: read self-scoped; write is dual
(client + server). Sync: primarily Client→Server, Low priority.

### Repeat Pool — view/query definition, no table
Logical basis: latest Attempt per `(user_id, exam_id, question_id)` by
`answered_at`, filtered to `is_correct = false`; abandoned-session
Attempts still count. Output shape: `user_id, exam_id, question_id,
attempt_id`. Security-invoker constraint stands. Local and server
computations must produce identical results.

---

## Cross-Cutting Summary

- **Write postures, four patterns:** no-client-write-ever (Entitlement,
  PackageAccess); client-insert-only with narrow server exception
  (Attempt); client-insert-and-update (Exam Session); dual client/server
  write (Learning Metrics); read-only content (Exam/Topic/Question/Package).
- **Retention posture:** RESTRICT from identity toward Entitlement,
  Attempt, Exam Session, Learning Metrics. Only `user_profiles →
  auth.users` cascades.
- **SQLite divergence:** `synced_at` columns exist only locally, on every
  client-generated table.
- **Idempotency:** client-generated UUIDs + upsert semantics.

## Open Implementation Notes Carried Into SQL Phase
ID generation locus; content actor model; cross-table integrity checks
(app/trigger-level); "exactly one correct option" mechanism; account-
standing field (future); Entitlement history/reason mechanism (future);
account-deletion/anonymization flow (future); Learning Metrics
client/server conflict rule (unresolved); metric_type enforcement
mechanism (deferred to SQL phase).
