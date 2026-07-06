-- 20260706000006_harden_exam_sessions.sql
-- Phase 3B.3.3 — server-side hardening of exam_sessions to match the
-- validation apps/mobile/src/application/StartExamSessionUseCase.ts
-- already performs client-side (Phase 3B.3.1). Until now, RLS only
-- checked user_id = auth.uid() on INSERT/UPDATE: nothing server-side
-- verified that package_id actually belongs to exam_id, that the
-- package was PUBLISHED/ZORLAYICI_DENEME, that the user actually had
-- access, that user_id/exam_id/package_id/started_at stayed fixed after
-- creation, or that a user couldn't hold two IN_PROGRESS sessions for
-- the same exam. This migration closes all of those gaps.
--
-- Why trigger-based, not RLS subqueries: every other cross-table
-- integrity check in this schema (check_package_access_same_exam,
-- check_topic_parent_same_exam, check_attempt_integrity) is a BEFORE
-- INSERT/UPDATE trigger, not an RLS USING/WITH CHECK subquery. RLS
-- policies in this project answer "whose row is this" (self-scoping) or
-- "is this content visible" (Group 1/2 content policies) — cross-table
-- business-rule integrity (does this package belong to this exam, is it
-- eligible, etc.) has consistently been a trigger's job. This migration
-- keeps that division rather than inventing a second pattern for one
-- table.
--
-- Why no SECURITY DEFINER: the trigger function below reads packages,
-- exams, package_access, and entitlements — but only rows already
-- visible to the inserting user under existing policies:
--   - packages/exams: packages_select_published / exams_select_published
--     expose any PUBLISHED row to every authenticated user, and the rows
--     this trigger reads are exactly the ones the client just asked to
--     reference (new.package_id / new.exam_id).
--   - package_access/entitlements: this trigger only ever filters
--     entitlements.user_id = new.user_id, and RLS's own WITH CHECK on
--     exam_sessions_insert_self already forces new.user_id = auth.uid()
--     — so this is always the caller's own entitlement data, which
--     entitlements_select_self/package_access_select_self already expose
--     to them directly.
-- Unlike trial_access's check_trial_access_grant() (which must see
-- content the requesting user does NOT yet have RLS visibility into —
-- that is the entire point of a trial grant), there is no not-yet-visible
-- data here to bypass RLS for. Adding SECURITY DEFINER would only grant
-- privilege this function never needs, so it is deliberately omitted.
-- No REVOKE EXECUTE is added either: that treatment exists on
-- private.can_read_question / private.can_read_package_question because
-- those are SECURITY DEFINER functions that must never become directly
-- RPC-callable. A plain SECURITY INVOKER trigger function carries no
-- elevated privilege to lock down, and Postgres does not invoke
-- ordinary trigger functions via PostgREST RPC regardless.
--
-- Because this trigger is NOT SECURITY DEFINER, its internal reads of
-- packages/exams run under the invoking authenticated role and are
-- therefore still subject to packages_select_published/
-- exams_select_published RLS. This is acceptable — the whole check stays
-- fail-closed either way — but it means the *practical* error a client
-- sees for an unpublished or otherwise-hidden package/exam row may be
-- "package/exam % does not exist" (RLS hid the row, so the SELECT
-- returns nothing) rather than "is not PUBLISHED" (the explicit status
-- check below never gets a row to evaluate). Either message still
-- rejects the insert; only the wording differs depending on whether RLS
-- or the explicit status check is what actually caught it.
--
-- Why search_path is pinned (SET search_path = public, pg_temp): this
-- migration pins search_path so the public objects this function
-- references (packages/exams/package_access/entitlements) resolve before
-- any temp-schema objects and so name resolution stays explicit —
-- this is a property of this migration's own functions, not a claim
-- about every function already in this schema (several baseline
-- functions from earlier migrations do not pin search_path at all).


-- ============================================================================
-- 1. Package/exam eligibility + access check — BEFORE INSERT only.
-- ============================================================================
-- INSERT-only is sufficient because package_id/exam_id/user_id become
-- immutable after creation (see check_exam_session_status_transition
-- below) — there is no future UPDATE that could make a session point at
-- a different, unvalidated package/exam.
create or replace function public.check_exam_session_package_eligibility()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  pkg_exam_id uuid;
  pkg_status text;
  pkg_type text;
  pkg_is_free_tier boolean;
  exam_status text;
  has_access boolean;
begin
  select exam_id, status, package_type, is_free_tier
    into pkg_exam_id, pkg_status, pkg_type, pkg_is_free_tier
    from packages where id = new.package_id;

  if pkg_exam_id is null then
    raise exception 'exam_sessions: package % does not exist', new.package_id;
  end if;
  if pkg_exam_id != new.exam_id then
    raise exception 'exam_sessions: package % belongs to exam %, not requested exam %',
      new.package_id, pkg_exam_id, new.exam_id;
  end if;
  if pkg_status != 'PUBLISHED' then
    raise exception 'exam_sessions: package % is not PUBLISHED (status: %)', new.package_id, pkg_status;
  end if;
  if pkg_type != 'ZORLAYICI_DENEME' then
    raise exception 'exam_sessions: package % is not a Deneme package (type: %)', new.package_id, pkg_type;
  end if;

  select status into exam_status from exams where id = new.exam_id;
  if exam_status is null then
    raise exception 'exam_sessions: exam % does not exist', new.exam_id;
  end if;
  if exam_status != 'PUBLISHED' then
    raise exception 'exam_sessions: exam % is not PUBLISHED (status: %)', new.exam_id, exam_status;
  end if;

  -- Same two-path access rule as questions_select_entitled/_free_tier and
  -- the mobile StartExamSessionUseCase: free-tier packages never require
  -- an Entitlement row; otherwise an ACTIVE entitlement for this exact
  -- package (via package_access) is required. trial_access is not
  -- consulted — it can never apply to a ZORLAYICI_DENEME package
  -- (already enforced above), so it is irrelevant to this check.
  has_access := pkg_is_free_tier or exists (
    select 1
    from package_access pa
    join entitlements e on e.id = pa.entitlement_id
    where pa.package_id = new.package_id
      and e.user_id = new.user_id
      and e.exam_id = new.exam_id
      and e.status = 'ACTIVE'
  );
  if not has_access then
    raise exception 'exam_sessions: user % does not have access to package %', new.user_id, new.package_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_exam_sessions_check_package_eligibility on public.exam_sessions;

create trigger trg_exam_sessions_check_package_eligibility
  before insert on public.exam_sessions
  for each row execute function public.check_exam_session_package_eligibility();


-- ============================================================================
-- 2. Replace check_exam_session_status_transition() — same name, so the
--    existing trg_exam_sessions_check_status_transition trigger (created
--    in 20260702000003_activity_model.sql) picks up the new body without
--    needing to be dropped/recreated.
-- ============================================================================
-- Immutability is checked first, before the status state machine: a
-- request that both changes an immutable field AND an invalid status
-- transition should surface the immutability violation, since that is
-- the more fundamental integrity problem (rewriting which session this
-- row actually represents, not just its lifecycle stage).
create or replace function public.check_exam_session_status_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- updated_at is deliberately NOT included here — it is maintained by
  -- the existing trg_exam_sessions_set_updated_at trigger and is
  -- supposed to change on every update. completed_at/score/passed are
  -- also deliberately not blocked here: they are exactly what a
  -- legitimate COMPLETED transition needs to set, and are governed by
  -- the status state machine below, not by this immutability check.
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.exam_id is distinct from old.exam_id
     or new.package_id is distinct from old.package_id
     or new.started_at is distinct from old.started_at
     or new.created_at is distinct from old.created_at then
    raise exception 'exam_sessions: id/user_id/exam_id/package_id/started_at/created_at are immutable after creation';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if old.status = 'IN_PROGRESS' and new.status in ('COMPLETED','ABANDONED') then
    return new;
  end if;

  raise exception 'Invalid exam session status transition: % -> %', old.status, new.status;
end;
$$;


-- ============================================================================
-- 3. One-active-session-per-(user, exam) invariant.
-- ============================================================================
-- Preflight: fail loudly if duplicate IN_PROGRESS rows already exist for
-- the same (user_id, exam_id) — creating the index below would otherwise
-- fail with an opaque "could not create unique index" error, or (worse,
-- if data were silently dropped to work around it) lose a real session
-- history. This never deletes or mutates anything; it only raises.
do $$
declare
  dup record;
begin
  for dup in
    select user_id, exam_id, count(*) as active_count
    from exam_sessions
    where status = 'IN_PROGRESS'
    group by user_id, exam_id
    having count(*) > 1
  loop
    raise exception
      'exam_sessions: user % already has % IN_PROGRESS sessions for exam % — resolve manually before applying uq_exam_sessions_one_active_per_user_exam',
      dup.user_id, dup.active_count, dup.exam_id;
  end loop;
end;
$$;

-- Race-safe by construction: unlike trial_access's COUNT-based cap
-- (which needs pg_advisory_xact_lock because a count can't be expressed
-- as a constraint), "at most one IN_PROGRESS row per (user_id, exam_id)"
-- is exactly what a partial unique index enforces atomically — the same
-- pattern already used by uq_question_options_one_correct. No advisory
-- lock, no additional trigger, and no TOCTOU window: Postgres itself
-- rejects a second concurrent INSERT before either transaction can
-- observe a false negative.
create unique index if not exists uq_exam_sessions_one_active_per_user_exam
  on public.exam_sessions(user_id, exam_id)
  where status = 'IN_PROGRESS';
