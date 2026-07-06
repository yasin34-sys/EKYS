-- 20260702000006_rls_policies.sql
-- RLS policies for the mobile client. Every table already has RLS
-- enabled with zero policies since its first migration (fail-closed by
-- default). This migration adds the first real policies, grouped by
-- access pattern.
--
-- "authenticated" throughout includes Supabase anonymous sessions:
-- signInAnonymously() issues a real JWT with role=authenticated and an
-- is_anonymous claim, so the bootstrap flow's automatic anonymous
-- session already satisfies this role.
--
-- Tables with no policy below (entitlements/package_access get
-- SELECT-only; every content table gets SELECT-only) are intentionally
-- left with no INSERT/UPDATE/DELETE policy for "authenticated" — the
-- absence of a matching permissive policy is what enforces server-only
-- writes, not an explicit deny. Those writes happen via service_role,
-- which bypasses RLS entirely and needs no policy.
--
-- repeat_pool needs no policy of its own: security_invoker = true
-- (already set when the view was created) means it runs with the
-- querying user's own permissions against `attempts`, so it inherits
-- attempts' SELECT policy below automatically.


-- ============================================================================
-- Group 1 — Public/Published Metadata Read
-- ============================================================================

create policy "exams_select_published"
on exams for select
to authenticated
using (status = 'PUBLISHED');

create policy "topics_select_published"
on topics for select
to authenticated
using (status = 'PUBLISHED');

create policy "packages_select_published"
on packages for select
to authenticated
using (status = 'PUBLISHED');


-- ============================================================================
-- Group 2 — Entitlement-Gated Content Read
-- ============================================================================
-- Two independent paths per table, each its own permissive policy
-- (Postgres OR's multiple permissive policies for the same operation
-- automatically): an active Entitlement, or the package being marked
-- is_free_tier. Free-tier access never involves an Entitlement row.

create policy "questions_select_entitled"
on questions for select
to authenticated
using (
  status = 'PUBLISHED'
  and exists (
    select 1 from package_questions pq
    join package_access pa on pa.package_id = pq.package_id
    join entitlements e on e.id = pa.entitlement_id
    where pq.question_id = questions.id
      and e.user_id = auth.uid()
      and e.status = 'ACTIVE'
  )
);

create policy "questions_select_free_tier"
on questions for select
to authenticated
using (
  status = 'PUBLISHED'
  and exists (
    select 1 from package_questions pq
    join packages p on p.id = pq.package_id
    where pq.question_id = questions.id
      and p.is_free_tier = true
      and p.status = 'PUBLISHED'
  )
);

create policy "question_options_select_entitled"
on question_options for select
to authenticated
using (
  exists (
    select 1 from questions q
    join package_questions pq on pq.question_id = q.id
    join package_access pa on pa.package_id = pq.package_id
    join entitlements e on e.id = pa.entitlement_id
    where q.id = question_options.question_id
      and q.status = 'PUBLISHED'
      and e.user_id = auth.uid()
      and e.status = 'ACTIVE'
  )
);

create policy "question_options_select_free_tier"
on question_options for select
to authenticated
using (
  exists (
    select 1 from questions q
    join package_questions pq on pq.question_id = q.id
    join packages p on p.id = pq.package_id
    where q.id = question_options.question_id
      and q.status = 'PUBLISHED'
      and p.is_free_tier = true
      and p.status = 'PUBLISHED'
  )
);

create policy "package_questions_select_entitled"
on package_questions for select
to authenticated
using (
  exists (
    select 1 from package_access pa
    join entitlements e on e.id = pa.entitlement_id
    where pa.package_id = package_questions.package_id
      and e.user_id = auth.uid()
      and e.status = 'ACTIVE'
  )
);

create policy "package_questions_select_free_tier"
on package_questions for select
to authenticated
using (
  exists (
    select 1 from packages p
    where p.id = package_questions.package_id
      and p.is_free_tier = true
      and p.status = 'PUBLISHED'
  )
);


-- ============================================================================
-- Group 3 — User Self Data
-- ============================================================================

create policy "user_profiles_select_self"
on user_profiles for select
to authenticated
using (id = auth.uid());

create policy "user_profiles_insert_self"
on user_profiles for insert
to authenticated
with check (id = auth.uid() and account_status = 'ANONYMOUS');

create policy "user_profiles_update_self"
on user_profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "attempts_insert_self"
on attempts for insert
to authenticated
with check (user_id = auth.uid());

create policy "attempts_select_self"
on attempts for select
to authenticated
using (user_id = auth.uid());
-- No UPDATE/DELETE policy: the server_verified_* write path is
-- service_role-only, matching the approved immutability posture.

create policy "exam_sessions_insert_self"
on exam_sessions for insert
to authenticated
with check (user_id = auth.uid());

create policy "exam_sessions_update_self"
on exam_sessions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "exam_sessions_select_self"
on exam_sessions for select
to authenticated
using (user_id = auth.uid());

create policy "learning_metrics_insert_self"
on learning_metrics for insert
to authenticated
with check (user_id = auth.uid());

create policy "learning_metrics_update_self"
on learning_metrics for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "learning_metrics_select_self"
on learning_metrics for select
to authenticated
using (user_id = auth.uid());


-- ============================================================================
-- Group 4 — Entitlement/Access Read
-- ============================================================================

create policy "entitlements_select_self"
on entitlements for select
to authenticated
using (user_id = auth.uid());
-- No INSERT/UPDATE/DELETE policy: entitlements are the strictest-write
-- table in the schema, service_role-only, with no client path at all.

create policy "package_access_select_self"
on package_access for select
to authenticated
using (
  exists (
    select 1 from entitlements e
    where e.id = package_access.entitlement_id
      and e.user_id = auth.uid()
  )
);
