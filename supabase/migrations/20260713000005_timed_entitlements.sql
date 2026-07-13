-- 20260713000005_timed_entitlements.sql
-- Phase 8B.1 -- timed premium access foundation.
--
-- Entitlements were originally lifetime/package-scoped. The product model
-- now uses prepaid/sureli premium access (3, 6, 9, 12 months), so an ACTIVE
-- entitlement must also be current in time. Null expires_at remains valid
-- for legacy/admin/lifetime grants; non-null expires_at must be in the future.
--
-- Not applied by this file alone: store receipt validation and entitlement
-- creation remain server-only future work. This migration only makes the
-- existing read/security checks understand expiry.

alter table public.entitlements
  add column if not exists expires_at timestamptz;

create index if not exists idx_entitlements_user_status_expires
  on public.entitlements(user_id, status, expires_at);

comment on column public.entitlements.expires_at is
  'When non-null, this entitlement grants access only until this timestamp. Null is reserved for legacy/admin/lifetime grants.';


-- ============================================================================
-- private.can_read_question -- same behavior as 20260706000005, with current
-- entitlement semantics added to the entitled branch.
-- ============================================================================
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

  if exists (
    select 1
    from package_questions pq
    join package_access pa on pa.package_id = pq.package_id
    join entitlements e on e.id = pa.entitlement_id
    where pq.question_id = p_question_id
      and e.user_id = v_user_id
      and e.status = 'ACTIVE'
      and (e.expires_at is null or e.expires_at > now())
  ) then
    return true;
  end if;

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


-- ============================================================================
-- private.can_read_package_question -- same behavior as 20260706000005, with
-- current entitlement semantics added to the entitled branch.
-- ============================================================================
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

  if exists (
    select 1
    from package_access pa
    join entitlements e on e.id = pa.entitlement_id
    where pa.package_id = p_package_id
      and e.user_id = v_user_id
      and e.status = 'ACTIVE'
      and (e.expires_at is null or e.expires_at > now())
  ) then
    return true;
  end if;

  if v_is_free_tier then
    return true;
  end if;

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


-- ============================================================================
-- public.check_exam_session_package_eligibility -- Deneme starts must also
-- reject expired timed entitlements.
-- ============================================================================
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

  has_access := pkg_is_free_tier or exists (
    select 1
    from package_access pa
    join entitlements e on e.id = pa.entitlement_id
    where pa.package_id = new.package_id
      and e.user_id = new.user_id
      and e.exam_id = new.exam_id
      and e.status = 'ACTIVE'
      and (e.expires_at is null or e.expires_at > now())
  );
  if not has_access then
    raise exception 'exam_sessions: user % does not have access to package %', new.user_id, new.package_id;
  end if;

  return new;
end;
$$;
