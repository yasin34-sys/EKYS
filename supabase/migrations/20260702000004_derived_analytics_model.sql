-- 20260702000004_derived_analytics_model.sql
-- Derived / Analytics Model: LearningMetric (table), RepeatPool (view)

create table if not exists learning_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete restrict,
  exam_id uuid not null references exams(id) on delete restrict,
  topic_id uuid references topics(id) on delete restrict,
  metric_type text not null,
  value numeric not null,
  computed_from timestamptz,
  computed_to timestamptz,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforces exactly one current row per metric key. Split into two
-- partial indexes because a plain UNIQUE constraint would not catch
-- duplicate exam-wide (topic_id IS NULL) rows, since NULL != NULL in
-- standard uniqueness semantics.
create unique index if not exists uq_learning_metrics_topic_scoped
  on learning_metrics(user_id, exam_id, topic_id, metric_type)
  where topic_id is not null;

create unique index if not exists uq_learning_metrics_exam_scoped
  on learning_metrics(user_id, exam_id, metric_type)
  where topic_id is null;

create trigger trg_learning_metrics_set_updated_at
  before update on learning_metrics
  for each row execute function set_updated_at();

-- Integrity: if a topic is referenced, it must belong to the same exam
-- as the metric row itself. Fires on insert and update, since
-- learning_metrics is an upsert-style table (not insert-only).
create or replace function check_learning_metric_topic_same_exam()
returns trigger as $$
declare
  topic_exam_id uuid;
begin
  if new.topic_id is not null then
    select exam_id into topic_exam_id from topics where id = new.topic_id;
    if topic_exam_id is null then
      raise exception 'Topic % does not exist', new.topic_id;
    end if;
    if topic_exam_id != new.exam_id then
      raise exception 'Learning metric topic must belong to the same exam (topic exam_id: %, metric exam_id: %)',
        topic_exam_id, new.exam_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_learning_metrics_check_topic_same_exam
  before insert or update on learning_metrics
  for each row execute function check_learning_metric_topic_same_exam();

alter table learning_metrics enable row level security;
-- No policies yet.
-- Future read policy: self-scoped (user reads only their own rows).
-- Future write policy: dual paths — client writes its own computed
-- values (self-scoped), and trusted server-side logic may
-- independently write recomputed values for validation/analytics.
-- Reconciling disagreements between the two remains an open question,
-- not resolved by this migration.


-- Repeat Pool: not a table. A view over Attempt, computing the latest
-- attempt per (user, exam, question) and including it only if that
-- latest attempt was incorrect. Attempts from abandoned Exam Sessions
-- still count — this query does not filter on exam_session_id or
-- exam_sessions.status at all, only on Attempt itself.
--
-- security_invoker = true respects the querying user's own RLS on
-- `attempts` instead of running with the view owner's permissions.
-- (Requires PostgreSQL 15+; Supabase's current default satisfies this.)
create view repeat_pool
  with (security_invoker = true)
as
select
  latest.user_id,
  latest.exam_id,
  latest.question_id,
  latest.id as attempt_id
from (
  select distinct on (a.user_id, a.exam_id, a.question_id)
    a.id,
    a.user_id,
    a.exam_id,
    a.question_id,
    a.is_correct,
    a.answered_at
  from attempts a
  order by
    a.user_id, a.exam_id, a.question_id,
    a.answered_at desc, a.created_at desc, a.id desc
) latest
where latest.is_correct = false;
