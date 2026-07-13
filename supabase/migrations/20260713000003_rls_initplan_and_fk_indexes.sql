-- Performance hardening from Supabase advisors:
-- 1. Add covering indexes for foreign keys that are not already indexed with
--    the FK column first.
-- 2. Recreate self-scoped RLS policies with `(select auth.uid())` so Postgres
--    can evaluate the auth helper once per statement instead of once per row.
--
-- Policy semantics are intentionally unchanged.

create index if not exists idx_attempts_exam_id
  on public.attempts(exam_id);

create index if not exists idx_attempts_question_id
  on public.attempts(question_id);

create index if not exists idx_attempts_selected_option_id
  on public.attempts(selected_option_id);

create index if not exists idx_exam_sessions_exam_id
  on public.exam_sessions(exam_id);

create index if not exists idx_exam_sessions_package_id
  on public.exam_sessions(package_id);

create index if not exists idx_exams_supersedes_exam_id
  on public.exams(supersedes_exam_id);

create index if not exists idx_learning_metrics_exam_id
  on public.learning_metrics(exam_id);

create index if not exists idx_learning_metrics_topic_id
  on public.learning_metrics(topic_id);

create index if not exists idx_trial_access_question_id
  on public.trial_access(question_id);


drop policy if exists "user_profiles_select_self" on public.user_profiles;
create policy "user_profiles_select_self"
on public.user_profiles for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "user_profiles_insert_self" on public.user_profiles;
create policy "user_profiles_insert_self"
on public.user_profiles for insert
to authenticated
with check (id = (select auth.uid()) and account_status = 'ANONYMOUS');

drop policy if exists "user_profiles_update_self" on public.user_profiles;
create policy "user_profiles_update_self"
on public.user_profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "attempts_insert_self" on public.attempts;
create policy "attempts_insert_self"
on public.attempts for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "attempts_select_self" on public.attempts;
create policy "attempts_select_self"
on public.attempts for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "exam_sessions_insert_self" on public.exam_sessions;
create policy "exam_sessions_insert_self"
on public.exam_sessions for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "exam_sessions_update_self" on public.exam_sessions;
create policy "exam_sessions_update_self"
on public.exam_sessions for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "exam_sessions_select_self" on public.exam_sessions;
create policy "exam_sessions_select_self"
on public.exam_sessions for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "learning_metrics_insert_self" on public.learning_metrics;
create policy "learning_metrics_insert_self"
on public.learning_metrics for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "learning_metrics_update_self" on public.learning_metrics;
create policy "learning_metrics_update_self"
on public.learning_metrics for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "learning_metrics_select_self" on public.learning_metrics;
create policy "learning_metrics_select_self"
on public.learning_metrics for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "entitlements_select_self" on public.entitlements;
create policy "entitlements_select_self"
on public.entitlements for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "package_access_select_self" on public.package_access;
create policy "package_access_select_self"
on public.package_access for select
to authenticated
using (
  exists (
    select 1
    from public.entitlements e
    where e.id = package_access.entitlement_id
      and e.user_id = (select auth.uid())
  )
);

drop policy if exists "trial_access_select_self" on public.trial_access;
create policy "trial_access_select_self"
on public.trial_access for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "trial_access_insert_self" on public.trial_access;
create policy "trial_access_insert_self"
on public.trial_access for insert
to authenticated
with check (user_id = (select auth.uid()));
