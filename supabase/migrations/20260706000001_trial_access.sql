-- 20260706000001_trial_access.sql
-- Phase 2B.4: capped free-trial access to otherwise-premium
-- practice/lesson questions — additive to, not a replacement for,
-- packages.is_free_tier (20260702000005), which remains the permanent,
-- unlimited, curated free allocation (PROJECT_CHARTER.md §8's "ilk 100
-- soru + 1 örnek deneme"). Deneme (ZORLAYICI_DENEME) is explicitly not
-- metered in this phase — see the trigger below.
--
-- One row = one Question permanently unlocked for that User via the
-- trial mechanism, independent of packages.is_free_tier/entitlement.
-- This is what makes an already-granted trial question stay usable
-- offline forever (by design) while an ungranted one can never be
-- served offline (see apps/mobile/src/sync/PullSync.ts) — enforcement
-- lives here, at the RLS/trigger layer, not in client code.

create table if not exists trial_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete restrict,
  question_id uuid not null references questions(id) on delete restrict,
  package_id uuid not null references packages(id) on delete restrict,
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);
-- Grants are per-question, not per-(question, package): if the same
-- question is ever re-requested citing a different package_id than the
-- one it was originally granted under (e.g. the question appears in
-- more than one package), the unique constraint on (user_id,
-- question_id) is what the idempotency check below and the caller's
-- expected `ON CONFLICT (user_id, question_id) DO NOTHING` both key
-- off — the question stays granted regardless of which package
-- "explains" it.

create index if not exists idx_trial_access_user_id on trial_access(user_id);
create index if not exists idx_trial_access_package_id on trial_access(package_id);

-- SECURITY DEFINER is required here, not added defensively: the
-- integrity checks below must read questions/packages/package_questions
-- for a question the requesting user does NOT yet have RLS visibility
-- into — that is the entire point of a trial grant, verifying
-- eligibility for content the user can't see yet. Running as the
-- default SECURITY INVOKER would have this function's own SELECTs
-- silently return zero rows under the querying user's own RLS,
-- incorrectly rejecting every legitimate trial request. Relies on this
-- function being owned by the migration-running role (superuser/
-- BYPASSRLS by default, same as every other migration in this project)
-- to actually bypass RLS on those reads.
--
-- `search_path` is pinned explicitly to `public` to close the
-- well-known SECURITY DEFINER search_path hijack: without this, a
-- role able to create objects earlier in an unpinned search_path could
-- shadow the unqualified table/function names used below.
create or replace function check_trial_access_grant()
returns trigger as $$
declare
  existing_id uuid;
  pq_package_id uuid;
  q_status text;
  p_status text;
  p_is_free_tier boolean;
  p_package_type text;
  current_count integer;
begin
  -- Idempotency shortcut: a repeat grant request for a (user, question)
  -- pair the user already has must never fail just because they're
  -- already at the cap — it isn't consuming a new slot. Returning NEW
  -- here (without raising) lets the caller's expected
  -- `ON CONFLICT (user_id, question_id) DO NOTHING` resolve the actual
  -- duplicate at the statement level instead of this trigger
  -- pre-emptively rejecting it on the cap check below.
  select id into existing_id from trial_access
    where user_id = new.user_id and question_id = new.question_id;
  if existing_id is not null then
    return new;
  end if;

  -- Integrity: question must belong to package_id via package_questions.
  select pq.package_id into pq_package_id
    from package_questions pq
    where pq.package_id = new.package_id and pq.question_id = new.question_id;
  if pq_package_id is null then
    raise exception 'trial_access: question % does not belong to package %', new.question_id, new.package_id;
  end if;

  -- Eligibility: question must exist and be PUBLISHED.
  select status into q_status from questions where id = new.question_id;
  if q_status is null then
    raise exception 'trial_access: question % does not exist', new.question_id;
  end if;
  if q_status != 'PUBLISHED' then
    raise exception 'trial_access: question % is not PUBLISHED', new.question_id;
  end if;

  -- Eligibility: package must exist, be PUBLISHED, not already
  -- is_free_tier (free-tier content is already unconditionally open
  -- and must never consume a trial slot), and not a Deneme package
  -- (Deneme is explicitly not metered in this phase).
  select status, is_free_tier, package_type
    into p_status, p_is_free_tier, p_package_type
    from packages where id = new.package_id;
  if p_status is null then
    raise exception 'trial_access: package % does not exist', new.package_id;
  end if;
  if p_status != 'PUBLISHED' then
    raise exception 'trial_access: package % is not PUBLISHED', new.package_id;
  end if;
  if p_is_free_tier then
    raise exception 'trial_access: package % is already free-tier; trial grants are for premium content only', new.package_id;
  end if;
  if p_package_type = 'ZORLAYICI_DENEME' then
    raise exception 'trial_access: Deneme packages are not eligible for trial access in this phase';
  end if;

  -- Cap check, race-guarded: pg_advisory_xact_lock serializes concurrent
  -- grant requests for the same user_id within the current transaction
  -- (auto-released at transaction end, which lines up with a single
  -- INSERT statement's implicit transaction) — without this, two
  -- near-simultaneous requests could both read count = 99 before either
  -- commits and both succeed, landing the user at 101. hashtext()
  -- reduces the uuid to an int4 lock key; the second argument (0) only
  -- fills the two-key overload and carries no separate meaning.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text), 0);

  select count(*) into current_count from trial_access where user_id = new.user_id;
  if current_count >= 100 then
    raise exception 'trial_access: cap of 100 reached for user %', new.user_id;
  end if;

  return new;
end;
$$ language plpgsql
   security definer
   set search_path = public;

create trigger trg_trial_access_check_grant
  before insert on trial_access
  for each row execute function check_trial_access_grant();

alter table trial_access enable row level security;

create policy "trial_access_select_self"
on trial_access for select
to authenticated
using (user_id = auth.uid());

create policy "trial_access_insert_self"
on trial_access for insert
to authenticated
with check (user_id = auth.uid());
-- No UPDATE/DELETE policy: grants are permanent for the account's
-- lifetime, same immutability posture as package_access. The cap and
-- all other invariants are enforced by the trigger above, not by this
-- policy — the policy only establishes self-scoping.


-- ============================================================================
-- Trial-Gated Content Read
-- ============================================================================
-- A third, additive access path alongside the existing _entitled/
-- _free_tier policies from 20260702000006_rls_policies.sql (Postgres
-- ORs multiple permissive policies for the same operation
-- automatically) — granted content becomes visible once its
-- trial_access row exists.
--
-- Corrected 2026-07-06: this is deliberately NOT a plain mirror of the
-- _entitled/_free_tier policies' shape, despite the original version of
-- this migration claiming it was. The trigger above only checks package
-- eligibility once, at INSERT time — but a package can be unpublished/
-- archived, or have is_free_tier/package_type changed, at any point
-- after a grant already exists. Without re-checking eligibility at
-- SELECT time too, an already-granted trial question could stay
-- visible through a package that is no longer eligible for trial access
-- at all — a leak the trigger's own checks cannot prevent, since it
-- never runs again after the grant row is created. Every policy below
-- therefore joins to `packages` and re-verifies status/is_free_tier/
-- package_type on every read, in addition to the question-level
-- status='PUBLISHED' check the sibling policies already use at the
-- same points.
--
-- Corrected again 2026-07-06 (second pass): package eligibility alone
-- wasn't enough either — questions_select_trial and
-- question_options_select_trial still trusted trial_access's own
-- (user_id, question_id, package_id) triple as proof the question
-- currently belongs to that package, the same way the trigger checked
-- it once at grant time. But package_questions membership can change
-- after the grant (a question can be removed from a package without
-- touching trial_access or packages at all), and neither policy
-- re-checked it. Both now join package_questions explicitly
-- (pq.package_id = ta.package_id and pq.question_id = ta.question_id)
-- so a grant whose underlying package_questions row no longer exists
-- stops being visible, not just one whose package was unpublished.
-- package_questions_select_trial did not need this fix — see the note
-- immediately above that policy below.

create policy "questions_select_trial"
on questions for select
to authenticated
using (
  status = 'PUBLISHED'
  and exists (
    select 1 from trial_access ta
    join packages p on p.id = ta.package_id
    join package_questions pq
      on pq.package_id = ta.package_id and pq.question_id = ta.question_id
    where ta.question_id = questions.id
      and ta.user_id = auth.uid()
      and p.status = 'PUBLISHED'
      and p.is_free_tier = false
      and p.package_type != 'ZORLAYICI_DENEME'
  )
);

create policy "question_options_select_trial"
on question_options for select
to authenticated
using (
  exists (
    select 1 from questions q
    join trial_access ta on ta.question_id = q.id
    join package_questions pq
      on pq.package_id = ta.package_id and pq.question_id = ta.question_id
    join packages p on p.id = ta.package_id
    where q.id = question_options.question_id
      and q.status = 'PUBLISHED'
      and ta.user_id = auth.uid()
      and p.status = 'PUBLISHED'
      and p.is_free_tier = false
      and p.package_type != 'ZORLAYICI_DENEME'
  )
);

-- Unlike its two siblings above, this policy needed no additional
-- package_questions join: it evaluates directly against each
-- package_questions row (`ta.package_id = package_questions.package_id
-- and ta.question_id = package_questions.question_id`), so a row only
-- ever matches if that exact (package_id, question_id) membership
-- currently exists in this very table — there is no separate
-- membership fact to go stale here, unlike questions/question_options
-- where membership is a fact about a different table entirely.
create policy "package_questions_select_trial"
on package_questions for select
to authenticated
using (
  exists (
    select 1 from trial_access ta
    join packages p on p.id = ta.package_id
    join questions q on q.id = ta.question_id
    where ta.package_id = package_questions.package_id
      and ta.question_id = package_questions.question_id
      and ta.user_id = auth.uid()
      and p.status = 'PUBLISHED'
      and p.is_free_tier = false
      and p.package_type != 'ZORLAYICI_DENEME'
      and q.status = 'PUBLISHED'
  )
);
