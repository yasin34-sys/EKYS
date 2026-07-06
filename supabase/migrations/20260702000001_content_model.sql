-- 20260702000001_content_model.sql
-- Content Model: Exam, Topic, Question, QuestionOption, Package, PackageQuestion

-- Reusable trigger function: keeps updated_at accurate on every UPDATE,
-- for every table that has the column.
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','INTERNAL','BETA','PUBLISHED','ARCHIVED')),
  question_count integer not null check (question_count > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  passing_score numeric not null check (passing_score >= 0),
  supersedes_exam_id uuid references exams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exams_status on exams(status);

create trigger trg_exams_set_updated_at
  before update on exams
  for each row execute function set_updated_at();

alter table exams enable row level security;
-- No policies yet in this migration. RLS enabled + zero policies means
-- fail-closed by default. Policies are added incrementally in a later
-- phase, scoped to each Repository method as it is implemented.


create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete restrict,
  parent_topic_id uuid references topics(id) on delete set null,
  name text not null,
  display_order integer not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_topics_exam_id on topics(exam_id);
create index if not exists idx_topics_parent_topic_id on topics(parent_topic_id);
create index if not exists idx_topics_exam_display_order on topics(exam_id, display_order);

create trigger trg_topics_set_updated_at
  before update on topics
  for each row execute function set_updated_at();

-- Integrity: a topic's parent must belong to the same exam.
create or replace function check_topic_parent_same_exam()
returns trigger as $$
declare
  parent_exam_id uuid;
begin
  if new.parent_topic_id is not null then
    select exam_id into parent_exam_id from topics where id = new.parent_topic_id;
    if parent_exam_id is null then
      raise exception 'Parent topic % does not exist', new.parent_topic_id;
    end if;
    if parent_exam_id != new.exam_id then
      raise exception 'Topic parent must belong to the same exam (parent exam_id: %, topic exam_id: %)',
        parent_exam_id, new.exam_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_topics_check_parent_same_exam
  before insert or update on topics
  for each row execute function check_topic_parent_same_exam();

alter table topics enable row level security;


create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete restrict,
  topic_id uuid not null references topics(id) on delete restrict,
  question_type text not null default 'SINGLE_CHOICE'
    check (question_type in ('SINGLE_CHOICE')),
  body text not null,
  revision integer not null default 1,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_questions_topic_id on questions(topic_id);
create index if not exists idx_questions_exam_id on questions(exam_id);
create index if not exists idx_questions_status on questions(status);

create trigger trg_questions_set_updated_at
  before update on questions
  for each row execute function set_updated_at();

-- Integrity: a question's topic must belong to the same exam.
create or replace function check_question_topic_same_exam()
returns trigger as $$
declare
  topic_exam_id uuid;
begin
  select exam_id into topic_exam_id from topics where id = new.topic_id;
  if topic_exam_id is null then
    raise exception 'Topic % does not exist', new.topic_id;
  end if;
  if topic_exam_id != new.exam_id then
    raise exception 'Question topic must belong to the same exam (topic exam_id: %, question exam_id: %)',
      topic_exam_id, new.exam_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_questions_check_topic_same_exam
  before insert or update on questions
  for each row execute function check_question_topic_same_exam();

alter table questions enable row level security;


create table if not exists question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label char(1) not null check (label in ('A','B','C','D','E')),
  body text not null,
  is_correct boolean not null default false,
  display_order integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_question_options_question_id on question_options(question_id);
create unique index if not exists uq_question_options_one_correct
  on question_options(question_id) where is_correct = true;

alter table question_options enable row level security;
-- No updated_at on this table — no trigger needed.


create table if not exists packages (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete restrict,
  package_type text not null
    check (package_type in ('TEMEL_CALISMA','YOGUN_TEKRAR','ZORLAYICI_DENEME')),
  difficulty_level text not null
    check (difficulty_level in ('KOLAY','ORTA','ZOR')),
  version integer not null default 1 check (version > 0),
  checksum text,
  bundle_path text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_packages_exam_id on packages(exam_id);
create index if not exists idx_packages_exam_type_difficulty
  on packages(exam_id, package_type, difficulty_level);

create trigger trg_packages_set_updated_at
  before update on packages
  for each row execute function set_updated_at();

alter table packages enable row level security;


create table if not exists package_questions (
  package_id uuid not null references packages(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  display_order integer not null,
  created_at timestamptz not null default now(),
  primary key (package_id, question_id)
);

create index if not exists idx_package_questions_question_id on package_questions(question_id);

-- Integrity: package and question in a PackageQuestion row must share the same exam.
create or replace function check_package_question_same_exam()
returns trigger as $$
declare
  pkg_exam_id uuid;
  q_exam_id uuid;
begin
  select exam_id into pkg_exam_id from packages where id = new.package_id;
  select exam_id into q_exam_id from questions where id = new.question_id;
  if pkg_exam_id is null then
    raise exception 'Package % does not exist', new.package_id;
  end if;
  if q_exam_id is null then
    raise exception 'Question % does not exist', new.question_id;
  end if;
  if pkg_exam_id != q_exam_id then
    raise exception 'Package and question must belong to the same exam (package exam_id: %, question exam_id: %)',
      pkg_exam_id, q_exam_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_package_questions_check_same_exam
  before insert or update on package_questions
  for each row execute function check_package_question_same_exam();

alter table package_questions enable row level security;
-- No updated_at on this table — no trigger needed.
