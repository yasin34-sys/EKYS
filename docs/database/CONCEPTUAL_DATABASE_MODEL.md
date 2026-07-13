# Conceptual Database Model — EKYS CEPTE

Status: Approved as conceptual review artifact (2026-07-02)

## Purpose
This document records the consolidated conceptual database model for EKYS CEPTE's core domain (Content, User/Access, Activity, Derived/Analytics), reviewed and approved group-by-group against the Domain Model Blueprint (`implementation-blueprint/05-domain-model.md`) and Database Design Blueprint (`implementation-blueprint/06-database-design.md`).

**This document is conceptual. It is not SQL. It is not a migration. It is the approved input for future schema and migration design.**

---

## 1. Entity Relationship Overview

```
Exam (isolation boundary)
 ├─ Topic (self-referencing hierarchy)
 ├─ Question (topic_id + explicit exam_id) ─┐
 │                                          ├─ PackageQuestion (M:N) ─ Package (type, difficulty, version = OTA)
 └────────────────────────────────────────┘

User (minimal: id, account_status, timestamps)
 └─ Entitlement (exam-scoped, status, source) ─ PackageAccess (M:N) ─ Package

User ─ Attempt (exam_id, question_id, exam_session_id nullable, sequence)
User ─ Exam Session (exam_id, package_id, status, score snapshot)
        Attempt.exam_session_id → Exam Session (1:N, no join table)

Repeat Pool       = derived from Attempt (no table)
Learning Metrics  = cached derived table, computed from Attempt / Exam Session
```

---

## 2. Content Model

### Exam
Isolation boundary for the whole schema. Fields: id, name, lifecycle status (Draft → Internal → Beta → Published → Archived, per ADR-013), configuration (`question_count`, `duration_minutes`, `passing_score`), **`supersedes` / `previous_exam_id`** (nullable, self-referencing, optional, informational-only — never authoritative), audit metadata. Server (PostgreSQL) authoritative. Local (SQLite) holds only Published exams. RLS fail-closed from creation; Published metadata likely broadly readable, Draft/Internal/Beta restricted to Editorial CMS roles. Server → Client sync only, static content.

**Karar (2026-07-02):** A genuinely incompatible exam format change (question count, time limit, or subject structure) creates a **new Exam record**, not a version bump on the existing one — this preserves Exam Context Isolation and prevents historical Attempts, Exam Sessions, Entitlements, and Learning Metrics from blending across incompatible formats. Minor corrections (e.g., fixing a `passing_score` typo) remain in-place on the existing Exam record, tracked via its audit metadata — they do not create a new Exam. A new Exam may reference the one it replaces via `supersedes`/`previous_exam_id`.

**This relationship is optional and non-authoritative — informational only, expressing lineage between incompatible exam generations.** It must never be used for authorization, entitlement inheritance, synchronization, analytics aggregation, or Exam Context Isolation. **Every Exam remains a completely independent isolation boundary**, regardless of whether `supersedes` is set. **Entitlement carryover to a superseding Exam must not be implied by the existence of this field** — it remains a separate, open product/business decision (see Section 7).

### Topic
Self-referencing hierarchy (no separate Subtopic entity, per Domain Model Blueprint). Fields: id, exam_id, parent_topic_id (nullable), name, display ordering, lifecycle status, audit metadata. Server authoritative content. RLS fail-closed; readable if parent Exam is Published; write restricted to Editorial CMS. Server → Client sync only.

**Karar (2026-07-02):** No hard nesting-depth limit is enforced at the schema level — the self-referencing hierarchy remains technically unbounded, keeping the architecture compatible with future exams (ADR-013) that may have different natural depths. Practical expected depth for current content is 2-3 levels, but this is a **usage expectation only, not a schema rule**. Recursive hierarchy traversal (`WITH RECURSIVE`, supported by both PostgreSQL and SQLite) is expected for descendant/breadcrumb queries.

Topic does **not** receive its own revision field — unlike Question, Topic is an organizational label, not a content-correctness-bearing entity; content-correctness concerns are handled at the Question level via `revision`. Topic edits (renaming, reparenting) are audit-tracked only (updated_at/updated_by), not versioned.

Topic records are never hard-deleted, only archived/deprecated (Database Design Blueprint Madde 23) — this is what prevents Question, Attempt, and Learning Metrics references from ever dangling. Attempt is fully insulated from Topic changes (it references `question_id`, never `topic_id`, directly). Learning Metrics may continue referencing an archived Topic for historical display purposes.

### Question
Fields: id, **exam_id** (explicit, denormalized rather than derived through Topic), topic_id, question content, **revision** (renamed from "version" to avoid confusion with Package's version), lifecycle status, audit metadata. Difficulty-neutral — difficulty is a Package attribute, not a Question attribute. Server authoritative; never queried independently by the mobile client — only reached via a downloaded Package. RLS fail-closed, most restrictive read policy in the Content Model (entitlement-gated, with a free-tier exception). Synced bundled inside Package downloads, not as an independent stream.

**Karar (2026-07-02):** Question gains a **`question_type`** discriminator field — an architectural extension point, not a type system. MVP supports exactly one value, **SINGLE_CHOICE**; no other type is implemented now, and no Rule Engine, Repository, UI, or validation branching is introduced for hypothetical future types. The application behaves exactly as a single-choice application today. Future question types remain additive (new type value + new typed fields), not breaking changes to this field's existence. New types are added only when a real product requirement exists — YAGNI remains the governing principle.

**Question options must remain structured, strongly typed, and relationally modeled rather than schema-less.** The exact physical representation (table structure, columns, relationships) is deliberately left to the SQL/schema design phase and is not frozen by this conceptual document.

### Package
Fields: id, exam_id, package_type (Temel Çalışma / Yoğun Tekrar / Zorlayıcı Deneme), difficulty_level (Kolay/Orta/Zor), **version** (confirmed as the OTA/content-distribution version, per ADR-005), checksum/integrity hash, lifecycle status, audit metadata. Package metadata and downloadable package content are treated as separate concerns: metadata may be broadly readable (for browsing before purchase), while the actual content bundle remains entitlement-protected. Server authoritative for definition; Local holds a read-only downloaded copy, never client-modifiable. RLS fail-closed. Server → Client, independently versioned per package (ADR-005 — updating one package never forces re-download of others).

**Karar (2026-07-02) — Mimari ilke:** The package is distributed as a **pre-generated, published bundle artifact** — not assembled live per request. This gives a clean 1:1 mapping between a Package's version and its downloadable artifact, a stable checksum computed once at generation/publish time, and matches ADR-005's "only the changed package re-downloads" behavior directly. The bundle is produced during the Editorial CMS publish workflow (completing the "Dynamic Content Package Oluşturma" stage already named in ADR-006).

**Current implementation direction:** Supabase Storage + signed, time-limited URLs, issued only after server-side Entitlement/PackageAccess verification — entitlement enforcement stays entirely server-side, never delegated to the client or to the URL itself.

**The local SQLite import strategy is explicitly not decided here** — whether the bundle is a prebuilt SQLite file, a JSON/structured payload imported row-by-row, or another physical representation remains an open, later SQL/implementation decision (see Section 7).

### PackageQuestion
Confirmed true many-to-many relationship — a Question may belong to multiple Packages. Fields: package_id, question_id, ordering (open question — see Section 7). Server authoritative, bundled with Package sync, RLS mirrors Package's own access rules.

---

## 3. User / Access Model

### User
Intentionally minimal for MVP: id (matches Supabase Auth identity), account_status, created_at, updated_at. No profile fields introduced. Companion/extension table to Supabase Auth's own managed identity table, not a re-implementation of identity. Not exam-scoped (Shared User, per ADR-013). RLS fail-closed, self-access-only. Server → Client sync for the current user's own profile only.

### Entitlement
Fields: id, user_id, exam_id, status (ACTIVE / REVOKED / EXPIRED / RESTORED), source (APPLE / GOOGLE / ADMIN / PROMOTION), granted_at, optional expires_at for timed premium access, audit metadata. Exam-scoped (per ADR-013 and Domain Model Blueprint). **Server authoritative, absolute — no client write path exists under any circumstance**; managed exclusively by trusted server-side logic. RLS fail-closed, read-only for the owning user's own rows. Server → Client sync only, High priority (ADR-012). An ACTIVE entitlement grants access only while expires_at is null (legacy/admin/lifetime) or in the future.

### PackageAccess
Dedicated relationship: `User → Entitlement → PackageAccess → Package`. Fields: id, entitlement_id, package_id. May initially grant "all Packages of an Exam," but exists specifically to future-proof package-level licensing without a schema redesign later. Server-managed only, no client write path. RLS fail-closed. Server → Client, bundled with Entitlement sync, High priority.

### TrialAccess
**Added Phase 2B.4 — 2026-07-06.** A capped, per-Question free-trial mechanism, additive to and independent of `is_free_tier`: `is_free_tier` remains the permanent, unlimited, curated free allocation (PROJECT_CHARTER.md §8); TrialAccess is a separate, metered allowance into otherwise-premium practice/lesson content. Fields: id, user_id, question_id, package_id, granted_at, audit metadata. One row = one Question permanently unlocked for that User, regardless of `is_free_tier`/Entitlement state — this is what keeps an already-granted trial Question usable offline indefinitely, while an ungranted one can never be served offline (enforcement lives at the RLS/trigger layer, not client code, per ADR-011's Trust Model).

**Karar (2026-07-06):**
- Cap is 100 total grants per User, across all packages, enforced server-side by a `BEFORE INSERT` trigger (not by RLS policy conditions alone, and never by client-side logic) — a race-safe count via `pg_advisory_xact_lock` keyed on `user_id`.
- Deneme (`ZORLAYICI_DENEME`) packages are explicitly excluded from this mechanism in this phase — the trigger rejects any grant attempt against one. Deneme's free sample remains served entirely by the existing `is_free_tier` mechanism (PROJECT_CHARTER.md's "1 örnek deneme").
- A grant already held for a given `(user_id, question_id)` is idempotent — re-requesting it never fails due to the cap, since it consumes no new slot.
- Server-managed grant creation, but via a **direct, self-scoped client INSERT** (capped by the trigger), not an RPC function — ADR-011's Zero Trust/Fail Secure/"no security decision relies on client code secrecy" principles are satisfied equally by either mechanism, so the smaller-footprint direct-insert path was chosen. RLS: self-scoped select/insert only, no update/delete (grants are permanent, matching PackageAccess's own immutability).
- Sync: Server → Client, bundled with the interim content hydration pull (`questions`/`question_options`/`package_questions`, itself an interim path pending the real ADR-005 bundle pipeline) — pulled last in that sequence, since it is what makes the corresponding trial-gated `questions`/`question_options`/`package_questions` rows visible to this device at all.
- **Added 2026-07-06 (Phase 2B.4B.1):** before a grant can be created for a package a user hasn't touched yet, the client needs a candidate `question_id` to request — and no existing RLS path exposes one for a premium, non-free-tier package (every content policy, including TrialAccess's own, requires access that doesn't exist yet). A dedicated structural view, `trial_candidate_questions` (package_id/question_id/display_order only, never content), closes this ahead of the actual grant insert. See `PHYSICAL_DATABASE_SCHEMA.md`.
- **Corrected 2026-07-06 (Phase 2B.4B.2.1):** `package_id` on a TrialAccess row is the package that was checked for eligibility at grant (`INSERT`) time — it is **not** a permanent read-scope. Since `PackageQuestion` is a true many-to-many relationship, a granted Question can legitimately belong to more than one Package; ongoing read visibility is keyed by `(user_id, question_id)` plus a currently-eligible Package reached through *any* current `PackageQuestion` membership, re-checked live on every read — not specifically the one Package recorded on the grant row. See `PHYSICAL_DATABASE_SCHEMA.md` for the corrected policy shapes.

### Exam Access
**No table.** Free-tier access (PROJECT_CHARTER.md's "first 100 questions + 1 sample exam") is policy-based — expressed as an RLS/application rule, not stored state. **Distinct from TrialAccess above:** this remains the permanent `is_free_tier` allocation; TrialAccess is the newer, separate, capped mechanism layered on top of it.

---

## 4. Activity Model

### Attempt
Fields: id, user_id, exam_id, question_id, exam_session_id (nullable — free practice vs. formal session), sequence/position (when exam_session_id is present), selected response, correctness indicator, answered_at, idempotency_key, sync_status. Correctness is computed client-side (required for instant offline feedback); the server may independently re-verify after sync for integrity/anti-cheating purposes, without ever blocking offline usage. Multiple attempts per Question are explicitly allowed (free practice, retries, historical analytics). Attempts from abandoned Exam Sessions still count toward Repeat Pool evaluation — only an unanswered Question is excluded. Client Generated Data (ADR-012): locally authoritative until synced, then server becomes the durable record. RLS fail-closed, self-scoped client write allowed (idempotent). Client → Server, incremental sync, Medium priority.

### Exam Session
Fields: id, user_id, exam_id, package_id, status, started_at, completed_at, score/result snapshot, idempotency_key, sync_status. A completed session may store a final score/result snapshot — accepted because it represents a historical fact about that specific completed session, not a live-changing derived metric; Attempts remain the source of truth for recomputation and audit. Same client-generated/local-then-server-durable pattern as Attempt. RLS fail-closed, self-scoped client write. Client → Server, syncs on completion (Attempts sync incrementally throughout, reducing data-loss risk while preserving offline-first behavior).

- **Karar (2026-07-06, Phase 3B.3.3):** formal Deneme session creation is now server-enforced, not just client-validated — a trigger rejects package/exam mismatches, non-`PUBLISHED`/non-`ZORLAYICI_DENEME` packages, and missing access; `id`/`user_id`/`exam_id`/`package_id`/`started_at`/`created_at` are immutable post-creation (`updated_at` excluded — it is trigger-maintained); and a partial unique index guarantees at most one `IN_PROGRESS` session per (user, exam).

### (No separate Exam Session Attempt table)
Explicitly resolved, not an oversight: Attempt belongs to zero-or-one Exam Session (one-to-many, not many-to-many), so this relationship is fully represented by Attempt's own `exam_session_id` and `sequence` fields. A separate join table was judged unnecessary complexity — it would also duplicate RLS and sync surface that Attempt already covers.

---

## 5. Derived / Analytics Model

### Repeat Pool
**Not a table.** Modeled as derived data — never an authoritative source; Attempt history is always the single source of truth. Must be **computable both locally and on the server independently**, with both implementations required to produce identical results from the same Attempt history (local for full offline-first behavior, server for synchronization consistency and future services). Membership rule: the **latest meaningful Attempt** per (User, Exam, Question) determines current pool membership; attempts from abandoned Exam Sessions still count, only unanswered Questions are excluded. More nuanced logic (e.g., "wrong in the last N attempts") is left to future Learning Engine rules, not the base schema. Current architectural direction for implementation is a derived view or equivalent computed representation — concrete SQL remains out of scope of this document.

### Learning Metrics
Fields: id, user_id, exam_id, topic_id (nullable, for exam-wide metrics), metric_type (intentionally extensible — not a fixed enum), value, computed_at, basis/traceability reference (required by ADR-008's Explainability principle). **Intentionally stored as cached derived data** (unlike Repeat Pool) — justified because the Rule Engine's aggregation logic is more expensive to recompute live, the Dashboard must stay fast, and the Rule Engine is expected to grow more sophisticated over time. Attempt/Exam Session remain authoritative; Learning Metrics are always recomputable from them. RLS fail-closed, self-access read, client-writable (Rule Engine computes client-side). Server → Client, Low sync priority (ADR-012).

### Aggregation / Recomputation Strategy
Event-driven: recomputation is triggered by each new Attempt (per ADR-008's Rule Pipeline), not scheduled/batch. Recomputation is **incremental** — a new Attempt recomputes only the affected Topics and Metrics wherever possible, with full recomputation available as a recovery mechanism. The **Rule Engine executes client-side as the primary behavior**; the server does not become the primary execution engine, but may independently recompute metrics for validation, analytics, or future administration features. **The Dashboard always reads Learning Metrics and never derives analytics directly from raw Attempts** — the Rule Engine owns analytics, the Dashboard owns presentation only.

---

## 6. Cross-Cutting Principles

- **Exam Context Isolation:** every Content and User-scoped entity carries an explicit `exam_id` (Question's is denormalized rather than derived through Topic, by decision).
- **RLS posture:** every table is created RLS-enabled, fail-closed, from its first migration. Four distinct write postures exist across the model:
  - *No client write, ever:* Entitlement, PackageAccess.
  - *Client write, self-scoped, idempotent:* Attempt, Exam Session, Learning Metrics.
  - *No client write, read-only content:* Exam, Topic, Question, Package (writes are Editorial CMS-only).
  - *Client write, self-scoped, capped by a server-side trigger (added Phase 2B.4):* TrialAccess — the client may INSERT its own row directly, but a `BEFORE INSERT` trigger (not the RLS policy itself) enforces the 100-grant cap, idempotency, and content-eligibility checks. Distinct from the other three: authorization is self-scoped like the second pattern, but a stateful, count-dependent server-side rule gates whether a given insert is accepted, which none of the other patterns need.
- **Sync tiers (ADR-012):** High — Entitlement, PackageAccess. Medium — Attempt (incremental), Exam Session (on completion). Low — Learning Metrics. None — Repeat Pool (not stored).

---

## 7. Open Questions Carried Forward

These are explicitly **unresolved** — this document records them, it does not close them:

1. ~~ADR-009 anonymous → registered wording update~~ — **Çözüldü (2026-07-02):** ADR-009 now states identity never changes across the anonymous→registered upgrade; no re-keying/migration required. See ADR-009 Decision section.
2. ~~Exam version concept~~ — **Çözüldü (2026-07-02):** A genuinely incompatible format change creates a new Exam record (with an optional, informational-only, non-authoritative `supersedes`/`previous_exam_id` reference — never used for authorization, entitlement, sync, analytics, or isolation); minor corrections stay in-place with audit tracking. See Section 2 (Exam).
3. ~~Topic nesting/versioning~~ — **Çözüldü (2026-07-02):** unrestricted self-referencing depth (no schema-enforced cap), no dedicated revision field, audit-tracked edits only, archive-not-delete. See Section 2 (Topic).
4. ~~Question types~~ — **Çözüldü (2026-07-02):** `question_type` discriminator added as an architectural extension point; MVP supports SINGLE_CHOICE exclusively; future types are additive, not breaking; options remain structured/strongly-typed/relationally-modeled, with physical representation deferred to the SQL/schema design phase. See Section 2 (Question).
5. ~~Package content bundle mechanism~~ — **Çözüldü (2026-07-02):** architectural principle — pre-generated, published bundle artifact, produced at Editorial CMS publish time (current implementation direction: Supabase Storage + signed time-limited URLs, issued only after server-side Entitlement/PackageAccess verification). See Section 2 (Package).
6. PackageQuestion ordering (schema-level field vs. an Application Layer concern).
7. ~~Free-tier consumption tracking~~ — **Çözüldü (2026-07-06):** `is_free_tier` itself remains purely stateless/stateful-free, exactly as before — it is still an unconditional, permanent unlock with no per-user tracking. The stored per-user state this question anticipated belongs to a separate, new mechanism instead: TrialAccess (Section 3), a capped (100 total), per-Question grant record layered on top of, not inside, `is_free_tier`. See Section 3 (TrialAccess).
8. Restore purchases mechanics (does restoring reactivate an existing Entitlement row or create a new one?).
9. Learning Metrics client/server conflict rule (if the server independently recomputes a metric that disagrees with the client's value — e.g., due to a Rule Engine version gap — no resolution rule exists yet).
10. Repeat Pool security-invoker implementation constraint (not itself a question, but a standing constraint to honor whenever the actual view/query is written — see Section 8).
11. **Surfaced while resolving Question 2 — Entitlement carryover across a superseding Exam:** if a new Exam replaces an old one, do existing users automatically receive access to the new Exam, or is it treated as a separate purchase? This is a product/business decision, not an architecture one, and remains fully open. It must not be implied by the existence of `supersedes`/`previous_exam_id` on Exam.
12. **Carried forward from Question 3 — Topic split/merge operations:** dividing or combining Topics is a real editorial operation the schema can technically support, but the safe workflow for doing so without orphaning history is an Editorial CMS process concern (likely ADR-006), not a schema-shape question. Remains unresolved.
13. **Carried forward from Question 5 — Local SQLite import strategy:** whether the downloaded bundle is a prebuilt SQLite file, a JSON/structured payload imported row-by-row, or another physical representation is explicitly not decided. Deferred to the SQL/implementation phase.

---

## 8. Implementation Constraints

Binding constraints for whoever eventually writes schema/migrations — distinct from Section 7's open questions, which are undecided; these are already decided and must be honored:

- Every table is created RLS-enabled, fail-closed, from its first migration (Supabase CLI, standard PostgreSQL SQL — no Supabase-proprietary schema language).
- Local SQLite access is via `@op-engineering/op-sqlite`.
- Repeat Pool must never be implemented as a persistent authoritative table.
- If Repeat Pool is implemented as a PostgreSQL view, it must not bypass the underlying Attempt table's RLS — it must respect the querying user's own RLS-restricted access (security-invoker behavior), not run with elevated privileges.
- Entitlement and PackageAccess have no client write path under any circumstance.
- The Dashboard reads only Learning Metrics — never raw Attempt data directly.
- Local and server Repeat Pool computations must produce identical results from the same Attempt history.

---

## 9. Source Documents / References

- `PROJECT_CHARTER.md`
- `architecture/adr/ADR-002` (Supabase + PostgreSQL)
- `architecture/adr/ADR-003` (Offline First Architecture)
- `architecture/adr/ADR-004` (SQLite Local Database)
- `architecture/adr/ADR-005` (Dynamic Content Packages)
- `architecture/adr/ADR-006` (Editorial CMS)
- `architecture/adr/ADR-007` (Entitlement & Premium)
- `architecture/adr/ADR-008` (Rule Based Learning Engine)
- `architecture/adr/ADR-009` (Authentication Strategy)
- `architecture/adr/ADR-010` (State Management & Server State)
- `architecture/adr/ADR-011` (Security Strategy)
- `architecture/adr/ADR-012` (Synchronization Strategy)
- `architecture/adr/ADR-013` (Multi-Exam Architecture)
- `implementation-blueprint/05-domain-model.md`
- `implementation-blueprint/06-database-design.md`
- `implementation-blueprint/08-synchronization-contract.md`
- `implementation-blueprint/09-repository-pattern.md`
- `implementation-blueprint/10-application-layer.md`

---

## 10. Architectural Decisions Recorded

A quick-reference summary for future contributors of every database-related architectural decision finalized during this review:

- Question explicitly stores `exam_id` (denormalized, not derived through Topic).
- Question uses `revision` instead of `version` (to avoid confusion with Package's version).
- Package `version` represents the OTA/content-distribution version (ADR-005).
- PackageQuestion is a true many-to-many relationship.
- Difficulty belongs to Package, not Question — Question is difficulty-neutral.
- Package metadata and downloadable Package content are separate concerns with separate access rules.
- User remains intentionally minimal for MVP (id, account_status, timestamps only).
- Entitlement is server authoritative, absolute, with no client write path.
- PackageAccess is a dedicated relationship (`Entitlement → PackageAccess → Package`), future-proofing package-level licensing.
- ExamAccess is policy-based — no table.
- Attempt contains a nullable `exam_session_id` and a `sequence` field — no separate Exam Session Attempt table.
- Correctness is computed client-side; the server may independently re-verify post-sync, non-blocking.
- Multiple Attempts per Question are allowed.
- Exam Session stores a historical score/result snapshot (accepted as a historical fact, not a live derived metric).
- Attempt sync is incremental; Exam Session sync happens on completion.
- Repeat Pool is derived data — never an authoritative source, never a persistent table; computed both locally and server-side, with both required to match.
- Repeat Pool membership uses the latest meaningful Attempt per (User, Exam, Question); abandoned-session attempts still count.
- Learning Metrics are stored as cached derived data (not a pure view), with extensible metric types.
- The Rule Engine is client-primary; the server may independently recompute for validation/analytics but is not the primary execution engine.
- Metric recomputation is incremental, with full recomputation available as a recovery mechanism.
- The Dashboard reads Learning Metrics only — never raw Attempts directly.
- RLS is fail-closed from the first migration, for every table, as a technology-independent architectural principle currently implemented via PostgreSQL RLS.
- Supabase CLI is the migration tool (plain PostgreSQL SQL, no proprietary schema language).
- `@op-engineering/op-sqlite` is the local SQLite access library.
- A genuinely incompatible Exam format change creates a new Exam record (preserving Exam Context Isolation); minor corrections stay in-place with audit tracking. A new Exam may reference the one it replaces via `supersedes`/`previous_exam_id` — an optional, informational-only, non-authoritative field never used for authorization, entitlement inheritance, sync, analytics, or isolation. Every Exam remains a fully independent isolation boundary.
- Topic keeps its self-referencing hierarchy with no schema-enforced depth limit (future-exam compatible); no dedicated revision field — edits are audit-tracked only; Topic records are archived, never hard-deleted, so Question/Attempt/Learning Metrics references never dangle.
- Question gains a `question_type` discriminator (architectural extension point only); MVP supports SINGLE_CHOICE exclusively, with no branching logic anywhere for hypothetical future types. Question options must be structured, strongly typed, and relationally modeled — physical representation deferred to the SQL/schema design phase.
- Package content is distributed as a pre-generated, published bundle artifact — an architectural principle independent of any specific infrastructure (current implementation direction: Supabase Storage + signed, time-limited URLs, issued only after server-side Entitlement/PackageAccess verification). Local SQLite import strategy remains an open, later implementation decision.
- **(2026-07-06)** TrialAccess adds a capped (100 total per user), per-Question free-trial grant, additive to `is_free_tier` and independent of Entitlement — enforced by a server-side `BEFORE INSERT` trigger (race-guarded via advisory lock, idempotent on repeat grants, rejects Deneme packages), not by client logic or by RLS policy conditions alone. This is the fourth RLS write posture named in Section 6.

---

## 11. Future Extension Points

Intentional points where the architecture allows future growth, without committing to any of them now. These are **not commitments** — they document where the design deliberately leaves room, consistent with each source ADR's own Architecture Notes / Future Compatibility sections:

- Additional Exam types (ADR-013 — Multi-Exam Architecture already treats Exam as a first-class, non-EKYS-specific concept).
- Additional Question types beyond the current generic format.
- New Learning Metric types (explicitly supported by Learning Metrics' extensible `metric_type` design, Section 10).
- Additional Package types beyond the current three (Temel Çalışma / Yoğun Tekrar / Zorlayıcı Deneme).
- Subscription-style or hybrid licensing models (PROJECT_CHARTER.md Ek Notlar already anticipates this; PackageAccess exists partly to keep this possible).
- Team / Organization support (not present anywhere in current architecture — a genuine future extension, not a deferred decision).
- Multi-device conflict handling improvements beyond the current Last-Write-Wins strategy (ADR-012 Architecture Notes already flags this as a future-only concern).
- Future AI-assisted learning recommendations (ADR-008 explicitly excludes AI from the current Rule Based Learning Engine; any such feature would require its own separate ADR and would layer on top of, not replace, the deterministic core).
