-- 20260702000003_activity_model.sql
-- Activity Model: ExamSession, Attempt

create table if not exists exam_sessions (
  id uuid primary key,
  user_id uuid not null references user_profiles(id) on delete restrict,
  exam_id uuid not null references exams(id) on delete restrict,
  package_id uuid not null references packages(id) on delete restrict,
  status text not null default 'IN_PROGRESS'
    check (status in ('IN_PROGRESS','COMPLETED','ABANDONED')),
  started_at timestamptz not null,
  completed_at timestamptz,
  score numeric,
  passed boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status != 'COMPLETED' or completed_at is not null)
);
-- id has no default: the client generates it, and it doubles as the
-- idempotency key for sync (id-keyed upsert).

create index if not exists idx_exam_sessions_user_exam on exam_sessions(user_id, exam_id);
create index if not exists idx_exam_sessions_status on exam_sessions(status);

create trigger trg_exam_sessions_set_updated_at
  before update on exam_sessions
  for each row execute function set_updated_at();

-- Explicit state machine: only IN_PROGRESS -> COMPLETED and
-- IN_PROGRESS -> ABANDONED are valid transitions. Both COMPLETED and
-- ABANDONED are terminal. Same-status updates (e.g. editing other
-- fields without changing status) are allowed.
create or replace function check_exam_session_status_transition()
returns trigger as $$
begin
  if old.status = new.status then
    return new;
  end if;

  if old.status = 'IN_PROGRESS' and new.status in ('COMPLETED','ABANDONED') then
    return new;
  end if;

  raise exception 'Invalid exam session status transition: % -> %', old.status, new.status;
end;
$$ language plpgsql;

create trigger trg_exam_sessions_check_status_transition
  before update on exam_sessions
  for each row execute function check_exam_session_status_transition();

alter table exam_sessions enable row level security;
-- No policies yet. When added later: client INSERT and UPDATE allowed,
-- self-scoped — this table is a real exception to Attempt's insert-only
-- posture below, since a session legitimately progresses in place.
--
-- Sync note (not a DB-level construct — implemented at the
-- Repository/sync-queue layer, not in this migration): the session
-- syncs at creation (queued/background) and again on completion/update,
-- per the approved decision, since Attempt below references
-- exam_session_id and syncs incrementally — the parent row must exist
-- server-side before any synced Attempt can legally reference it.


create table if not exists attempts (
  id uuid primary key,
  user_id uuid not null references user_profiles(id) on delete restrict,
  exam_id uuid not null references exams(id) on delete restrict,
  question_id uuid not null references questions(id) on delete restrict,
  exam_session_id uuid references exam_sessions(id) on delete set null,
  sequence integer,
  selected_option_id uuid not null references question_options(id) on delete restrict,
  is_correct boolean not null,
  server_verified_correct boolean,
  server_verified_at timestamptz,
  answered_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (exam_session_id is null and sequence is null)
    or (exam_session_id is not null and sequence is not null)
  )
);
-- id has no default: client-generated, doubles as the idempotency key.

create index if not exists idx_attempts_user_exam_question_answered
  on attempts(user_id, exam_id, question_id, answered_at desc);
create index if not exists idx_attempts_exam_session_id on attempts(exam_session_id);
create index if not exists idx_attempts_user_exam on attempts(user_id, exam_id);

create trigger trg_attempts_set_updated_at
  before update on attempts
  for each row execute function set_updated_at();

-- Integrity, checked at insert time only (Attempt is client insert-only;
-- the narrow server-side verification update below does not touch
-- these referential fields, so re-checking on update is unnecessary):
--   1. question must belong to the same exam as the attempt
--   2. selected option must belong to the attempted question
--   3. if an exam session is referenced, it must match this attempt's
--      exam and user
create or replace function check_attempt_integrity()
returns trigger as $$
declare
  q_exam_id uuid;
  opt_question_id uuid;
  session_exam_id uuid;
  session_user_id uuid;
begin
  select exam_id into q_exam_id from questions where id = new.question_id;
  if q_exam_id is null then
    raise exception 'Question % does not exist', new.question_id;
  end if;
  if q_exam_id != new.exam_id then
    raise exception 'Attempt question must belong to the same exam (question exam_id: %, attempt exam_id: %)',
      q_exam_id, new.exam_id;
  end if;

  select question_id into opt_question_id from question_options where id = new.selected_option_id;
  if opt_question_id is null then
    raise exception 'Question option % does not exist', new.selected_option_id;
  end if;
  if opt_question_id != new.question_id then
    raise exception 'Selected option must belong to the attempted question (option question_id: %, attempt question_id: %)',
      opt_question_id, new.question_id;
  end if;

  if new.exam_session_id is not null then
    select exam_id, user_id into session_exam_id, session_user_id
      from exam_sessions where id = new.exam_session_id;
    if session_exam_id is null then
      raise exception 'Exam session % does not exist', new.exam_session_id;
    end if;
    if session_exam_id != new.exam_id or session_user_id != new.user_id then
      raise exception 'Exam session must match the attempt''s exam and user (session exam_id: %, user_id: %; attempt exam_id: %, user_id: %)',
        session_exam_id, session_user_id, new.exam_id, new.user_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_attempts_check_integrity
  before insert on attempts
  for each row execute function check_attempt_integrity();

alter table attempts enable row level security;
-- No policies yet. When added later: client INSERT only — never UPDATE,
-- never DELETE. Corrections are represented as new Attempt rows, not
-- edits. server_verified_correct / server_verified_at are a narrow,
-- non-client-reachable, append-only exception: only trusted server-side
-- logic may set them, and only once under normal operation (further
-- change only via an administrative recovery process, not a routine
-- policy).
