-- 20260706000003_trial_candidate_questions.sql
-- Phase 2B.4B.1 — server-only step. Does not modify 20260706000001 or
-- 20260706000002 (both already applied live), and does not touch any
-- existing package_questions/questions/question_options RLS policy.
--
-- Problem this closes (audited in Phase 2B.4B.0, no code until now):
-- the planned trial-grant flow needs the client to INSERT into
-- trial_access with a specific question_id it wants a grant for. But
-- under current RLS, a non-entitled, non-free-tier user cannot read
-- ANY package_questions/questions/question_options row for a premium
-- package before a trial_access grant already exists for that exact
-- question — and questions_select_trial/question_options_select_trial/
-- package_questions_select_trial all require that grant to already
-- exist. There is no legitimate path for the client to ever learn a
-- candidate question_id for a package it has never touched. This view
-- is that path — structural discovery only, never content.
--
-- security_invoker = false: runs as the view owner (a superuser/
-- BYPASSRLS role, same as every other migration-created object in this
-- project), deliberately bypassing package_questions/questions/packages'
-- own RLS — the opposite choice from repeat_pool's security_invoker =
-- true, and deliberately so: repeat_pool exposes per-user attempts data
-- and must stay subject to the querying user's own RLS, while this view
-- exposes only structural, non-per-user facts (which question ids exist
-- in which currently-eligible package, in what order) — the same class
-- of information packages_select_published already exposes to everyone
-- one level up.
--
-- security_barrier = true: this view is queried through PostgREST,
-- which lets a client attach arbitrary additional filters to the
-- request. Without security_barrier, the planner is free to push a
-- client-supplied filter below this view's own WHERE clause, which
-- could let a filter containing a side-effecting/leaky function run
-- against rows that should have been excluded first. security_barrier
-- forces this view's own qualification to be evaluated before any
-- filter added on top of it.
create view public.trial_candidate_questions
with (security_invoker = false, security_barrier = true)
as
select
  pq.package_id,
  pq.question_id,
  pq.display_order
from package_questions pq
join packages p on p.id = pq.package_id
join questions q on q.id = pq.question_id
where
  p.status = 'PUBLISHED'
  and p.is_free_tier = false
  and p.package_type != 'ZORLAYICI_DENEME'
  and q.status = 'PUBLISHED';

comment on view public.trial_candidate_questions is
$$Phase 2B.4B.1: structural trial-grant candidate discovery.

Intentionally bypasses package_questions/questions/packages RLS
(security_invoker = false, runs as the view owner) because a
non-entitled, non-free-tier client has no other legitimate way to
discover a question_id to request a trial grant for — every base-table
RLS path (questions_select_entitled/_free_tier/_trial and their
question_options/package_questions equivalents) requires access that
does not yet exist at the point this view is needed.

Exposes only package_id/question_id/display_order — never question
body, options, correct answers, explanations, or any entitlement/access
data. Those remain fully gated by the existing, untouched RLS policies
on questions/question_options/package_questions.

This view never grants access by itself. The only way to actually
unlock a question remains a direct INSERT into trial_access, still
validated and capped by check_trial_access_grant()
(20260706000001_trial_access.sql), whose EXECUTE privilege remains
revoked from client-facing roles (20260706000002).

Rows for ZORLAYICI_DENEME packages are excluded — Deneme is not metered
by the trial mechanism in this phase.

Because this is a live server-side query, not a cached or synced
value, an offline client can only ever see candidates it already
fetched while online, and cannot mint new discoverable content or new
access by itself.$$;

revoke all on public.trial_candidate_questions from public, anon, authenticated;
grant select on public.trial_candidate_questions to authenticated;
