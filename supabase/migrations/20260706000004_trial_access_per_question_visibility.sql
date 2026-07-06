-- 20260706000004_trial_access_per_question_visibility.sql
-- Phase 2B.4B.2.1 — correction pass. Does not modify 20260706000001,
-- 20260706000002, or 20260706000003 (all already applied live), and
-- does not touch trial_access's table shape, its BEFORE INSERT trigger/
-- cap/advisory-lock logic, or the trial_candidate_questions view.
--
-- Problem: trial_access is explicitly a per-Question grant — unique
-- (user_id, question_id), the grant insert/upsert is keyed by
-- (user_id, question_id), and 20260706000001's own comments already say
-- "the question stays granted regardless of which package explains it."
-- But the three trial SELECT policies from 20260706000001 (as corrected
-- in 2B.4A.1/2B.4A.2) still required
-- `pq.package_id = ta.package_id`/`ta.package_id = package_questions.
-- package_id` — binding ongoing read visibility to the specific
-- package_id the grant happened to be requested through. For a question
-- that legitimately belongs to more than one package (package_questions
-- is a true many-to-many relationship, per CONCEPTUAL_DATABASE_MODEL.md
-- §2 PackageQuestion), this contradicted the per-question grant model:
-- a grant made via package A would not make the same question visible
-- through package B, even though the underlying grant is supposed to be
-- package-agnostic once made.
--
-- Fix: trial_access.package_id is now treated purely as the grant
-- SOURCE — the package that was checked for eligibility at INSERT time
-- (still enforced by check_trial_access_grant(), untouched here) — not
-- as the permanent read-scope. Ongoing SELECT visibility is now keyed
-- only by (user_id, question_id) having a trial_access row, the
-- question currently being PUBLISHED, and a *currently existing*
-- package_questions membership through *any* eligible package (still
-- PUBLISHED, still is_free_tier = false, still not ZORLAYICI_DENEME) —
-- re-checked live on every read, same as before, just no longer pinned
-- to the one package_id recorded at grant time.
--
-- This does not expose any more structure than trial_candidate_questions
-- (20260706000003) already exposes to authenticated users generally —
-- it only makes the post-grant base-table RLS consistent with the
-- per-question grant model these tables were already designed around.

drop policy if exists "questions_select_trial" on questions;

create policy "questions_select_trial"
on questions for select
to authenticated
using (
  status = 'PUBLISHED'
  and exists (
    select 1 from trial_access ta
    join package_questions pq on pq.question_id = ta.question_id
    join packages p on p.id = pq.package_id
    where ta.question_id = questions.id
      and ta.user_id = auth.uid()
      and p.status = 'PUBLISHED'
      and p.is_free_tier = false
      and p.package_type != 'ZORLAYICI_DENEME'
  )
);

drop policy if exists "question_options_select_trial" on question_options;

create policy "question_options_select_trial"
on question_options for select
to authenticated
using (
  exists (
    select 1 from questions q
    join trial_access ta on ta.question_id = q.id and ta.user_id = auth.uid()
    join package_questions pq on pq.question_id = ta.question_id
    join packages p on p.id = pq.package_id
    where q.id = question_options.question_id
      and q.status = 'PUBLISHED'
      and p.status = 'PUBLISHED'
      and p.is_free_tier = false
      and p.package_type != 'ZORLAYICI_DENEME'
  )
);

drop policy if exists "package_questions_select_trial" on package_questions;

-- Evaluated directly against the outer package_questions row (the
-- table this policy is on) rather than re-deriving membership through
-- a separate pq alias — a grant for this question makes it visible
-- through every package it currently belongs to, not just the one it
-- was granted through.
create policy "package_questions_select_trial"
on package_questions for select
to authenticated
using (
  exists (
    select 1
    from trial_access ta
    join questions q on q.id = package_questions.question_id
    join packages p on p.id = package_questions.package_id
    where ta.question_id = package_questions.question_id
      and ta.user_id = auth.uid()
      and q.status = 'PUBLISHED'
      and p.status = 'PUBLISHED'
      and p.is_free_tier = false
      and p.package_type != 'ZORLAYICI_DENEME'
  )
);
