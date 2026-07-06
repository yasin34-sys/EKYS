-- 20260706000005_fix_content_rls_recursion.sql
-- Phase 2B.4C.1.1 — fixes infinite recursion in questions/question_options/
-- package_questions RLS. Does not modify any already-applied migration;
-- does not touch trial_access, its BEFORE INSERT trigger
-- (check_trial_access_grant), or the trial_candidate_questions view — all
-- three already ran as a SECURITY DEFINER / owner-bypass and never
-- triggered the cycle described below.
--
-- Root cause: questions_select_trial (on questions) queried
-- package_questions inside its EXISTS clause. Evaluating that subquery
-- forces Postgres to apply package_questions' own RLS policies, which
-- included package_questions_select_trial — whose EXISTS clause queried
-- questions again, re-triggering questions' policies (including
-- questions_select_trial) a second time. Because Postgres evaluates every
-- permissive policy on a table for any access check (not just the one
-- that would ultimately grant access), this cycle poisoned all reads on
-- all three content tables — including plain free-tier reads — the
-- moment the trial policies existed, matching the live "infinite
-- recursion detected in policy for relation questions" error.
--
-- Fix: move every access-path check into SECURITY DEFINER helper
-- functions living in a dedicated `private` schema. Once Postgres enters
-- one of these functions, every internal select/exists runs as the
-- function OWNER (a superuser/BYPASSRLS role, same as
-- check_trial_access_grant() already relies on) — RLS does not apply to
-- that role (none of these tables have FORCE ROW LEVEL SECURITY set), so
-- the functions' internal reads of package_questions/questions/packages/
-- package_access/entitlements/trial_access never invoke any table's RLS
-- policies at all. With no RLS re-entry, there is no cycle to detect.

create schema if not exists private;

comment on schema private is
  'Helper objects for RLS policy evaluation only. Must NEVER be added to '
  'Supabase''s exposed schemas (Dashboard: Settings -> API -> Exposed '
  'schemas / the PGRST_DB_SCHEMAS config) — PostgREST only serves schemas '
  'on that list as RPC-callable endpoints, so keeping this schema off it '
  'is what makes the functions below unreachable as a direct client call, '
  'independent of the EXECUTE grant authenticated needs to invoke them '
  'from inside a policy''s own evaluation.';

revoke all on schema private from public;
grant usage on schema private to authenticated;
-- Deliberately no grant to anon: every RLS policy in this project already
-- treats a Supabase anonymous session as role `authenticated`
-- (signInAnonymously() issues a JWT with role=authenticated, per
-- 20260702000006_rls_policies.sql's own header comment), so `anon` never
-- needs schema-level access here at all.


-- ============================================================================
-- private.can_read_question
-- ============================================================================
-- Consolidates the old questions_select_entitled / _free_tier / _trial
-- into one function covering all three access paths, in priority order:
-- active entitlement, then free-tier, then per-question trial grant.
-- Trial semantics match Phase 2B.4B.2.1 exactly: the grant is keyed by
-- (user_id, question_id) alone — never bound to trial_access.package_id —
-- and package_questions membership / package eligibility are re-checked
-- live against whatever the question currently belongs to.
create or replace function private.can_read_question(p_question_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
begin
  select status into v_status from questions where id = p_question_id;
  if v_status is null or v_status != 'PUBLISHED' then
    return false;
  end if;

  -- Entitled: any package (via package_questions -> package_access ->
  -- entitlements) this question currently belongs to, with an ACTIVE
  -- entitlement for the calling user.
  if exists (
    select 1
    from package_questions pq
    join package_access pa on pa.package_id = pq.package_id
    join entitlements e on e.id = pa.entitlement_id
    where pq.question_id = p_question_id
      and e.user_id = v_user_id
      and e.status = 'ACTIVE'
  ) then
    return true;
  end if;

  -- Free-tier: any currently-PUBLISHED, is_free_tier package this
  -- question belongs to.
  if exists (
    select 1
    from package_questions pq
    join packages p on p.id = pq.package_id
    where pq.question_id = p_question_id
      and p.is_free_tier = true
      and p.status = 'PUBLISHED'
  ) then
    return true;
  end if;

  -- Trial: a per-question grant for this exact question_id — NOT bound
  -- to trial_access.package_id — plus at least one currently-eligible
  -- (PUBLISHED, non-free-tier, non-Deneme) package this question belongs
  -- to right now.
  if exists (
    select 1
    from trial_access ta
    join package_questions pq on pq.question_id = ta.question_id
    join packages p on p.id = pq.package_id
    where ta.question_id = p_question_id
      and ta.user_id = v_user_id
      and p.status = 'PUBLISHED'
      and p.is_free_tier = false
      and p.package_type != 'ZORLAYICI_DENEME'
  ) then
    return true;
  end if;

  return false;
end;
$$;

comment on function private.can_read_question(uuid) is
  'SECURITY DEFINER: every internal select above runs as the function '
  'owner and bypasses RLS entirely, which is what breaks the recursive '
  'cycle the old per-path policies had (questions <-> package_questions). '
  'authenticated needs EXECUTE only so a policy''s USING clause can call '
  'this function as part of evaluating a query under RLS — that is not '
  'the same as this function being callable via PostgREST RPC, which is '
  'prevented by keeping schema private off the exposed-schemas list.';

revoke all on function private.can_read_question(uuid) from public, anon, authenticated;
grant execute on function private.can_read_question(uuid) to authenticated;


-- ============================================================================
-- private.can_read_package_question
-- ============================================================================
-- package_questions has no status of its own — eligibility is entirely
-- about the exact package_questions row, its linked question, and its
-- linked package. Verifies the exact (package_id, question_id) membership
-- exists first, before checking anything else, so a stale/removed
-- membership is never granted visibility just because the question or
-- package individually still qualify elsewhere.
create or replace function private.can_read_package_question(p_package_id uuid, p_question_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_question_status text;
  v_package_status text;
  v_is_free_tier boolean;
  v_package_type text;
  v_membership_exists boolean;
begin
  select exists (
    select 1 from package_questions
    where package_id = p_package_id and question_id = p_question_id
  ) into v_membership_exists;
  if not v_membership_exists then
    return false;
  end if;

  select status into v_question_status from questions where id = p_question_id;
  if v_question_status is null or v_question_status != 'PUBLISHED' then
    return false;
  end if;

  select status, is_free_tier, package_type
    into v_package_status, v_is_free_tier, v_package_type
    from packages where id = p_package_id;
  if v_package_status is null or v_package_status != 'PUBLISHED' then
    return false;
  end if;

  -- Entitled: ACTIVE entitlement for this exact package.
  if exists (
    select 1
    from package_access pa
    join entitlements e on e.id = pa.entitlement_id
    where pa.package_id = p_package_id
      and e.user_id = v_user_id
      and e.status = 'ACTIVE'
  ) then
    return true;
  end if;

  -- Free-tier: this exact package is free-tier.
  if v_is_free_tier then
    return true;
  end if;

  -- Trial: this exact package is non-free-tier (already established
  -- above) and non-Deneme, and the calling user holds a per-question
  -- grant for p_question_id — the grant lookup is by question_id only
  -- (per-question semantics, matching can_read_question); the
  -- eligibility of THIS package row is what is being verified here,
  -- independently of which package the grant was originally requested
  -- through.
  if v_package_type != 'ZORLAYICI_DENEME' and exists (
    select 1 from trial_access ta
    where ta.question_id = p_question_id
      and ta.user_id = v_user_id
  ) then
    return true;
  end if;

  return false;
end;
$$;

comment on function private.can_read_package_question(uuid, uuid) is
  'SECURITY DEFINER: internal selects bypass RLS the same way as '
  'can_read_question — see that function''s comment for why. Verifies '
  'the exact (package_id, question_id) package_questions row exists '
  'before checking any access path.';

revoke all on function private.can_read_package_question(uuid, uuid) from public, anon, authenticated;
grant execute on function private.can_read_package_question(uuid, uuid) to authenticated;


-- ============================================================================
-- Replace the 9 recursive policies with 3 non-recursive wrapper policies
-- ============================================================================

drop policy if exists "questions_select_entitled" on questions;
drop policy if exists "questions_select_free_tier" on questions;
drop policy if exists "questions_select_trial" on questions;

create policy "questions_select_content"
on questions for select
to authenticated
using (private.can_read_question(questions.id));

drop policy if exists "question_options_select_entitled" on question_options;
drop policy if exists "question_options_select_free_tier" on question_options;
drop policy if exists "question_options_select_trial" on question_options;

create policy "question_options_select_content"
on question_options for select
to authenticated
using (private.can_read_question(question_options.question_id));

drop policy if exists "package_questions_select_entitled" on package_questions;
drop policy if exists "package_questions_select_free_tier" on package_questions;
drop policy if exists "package_questions_select_trial" on package_questions;

create policy "package_questions_select_content"
on package_questions for select
to authenticated
using (private.can_read_package_question(package_questions.package_id, package_questions.question_id));
