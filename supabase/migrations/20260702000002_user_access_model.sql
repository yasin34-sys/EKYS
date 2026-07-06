-- 20260702000002_user_access_model.sql
-- User / Access Model: UserProfile, Entitlement, PackageAccess

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_status text not null
    check (account_status in ('ANONYMOUS','REGISTERED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_user_profiles_set_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();

alter table user_profiles enable row level security;
-- No policies yet. RLS enabled + zero policies = fail-closed by default.


create table if not exists entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete restrict,
  exam_id uuid not null references exams(id) on delete restrict,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE','PENDING','REVOKED','EXPIRED','RESTORED')),
  source text not null
    check (source in ('APPLE','GOOGLE','ADMIN','PROMOTION')),
  granted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_entitlements_user_exam on entitlements(user_id, exam_id);
create index if not exists idx_entitlements_exam_id on entitlements(exam_id);

create trigger trg_entitlements_set_updated_at
  before update on entitlements
  for each row execute function set_updated_at();

alter table entitlements enable row level security;
-- No policies yet. Strictest-write table in the schema — when policies
-- are added later, this table gets no client write policy at all
-- (server-only), only a self-scoped read policy.


create table if not exists package_access (
  entitlement_id uuid not null references entitlements(id) on delete cascade,
  package_id uuid not null references packages(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (entitlement_id, package_id)
);

create index if not exists idx_package_access_package_id on package_access(package_id);

-- Integrity: package and entitlement in a PackageAccess row must share the same exam.
create or replace function check_package_access_same_exam()
returns trigger as $$
declare
  pkg_exam_id uuid;
  ent_exam_id uuid;
begin
  select exam_id into pkg_exam_id from packages where id = new.package_id;
  select exam_id into ent_exam_id from entitlements where id = new.entitlement_id;
  if pkg_exam_id is null then
    raise exception 'Package % does not exist', new.package_id;
  end if;
  if ent_exam_id is null then
    raise exception 'Entitlement % does not exist', new.entitlement_id;
  end if;
  if pkg_exam_id != ent_exam_id then
    raise exception 'Package and entitlement must belong to the same exam (package exam_id: %, entitlement exam_id: %)',
      pkg_exam_id, ent_exam_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_package_access_check_same_exam
  before insert or update on package_access
  for each row execute function check_package_access_same_exam();

alter table package_access enable row level security;
-- No policies yet. No updated_at on this table — no timestamp trigger needed.
