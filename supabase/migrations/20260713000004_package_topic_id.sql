-- 20260713000004_package_topic_id.sql
-- Phase 8A.2 — adds packages.topic_id so a package can declare which
-- topic it belongs to directly, independent of package_questions.
--
-- Problem this fixes: Topic Detail (Phase 8A.1) derived "packages
-- relevant to this topic" by joining package_questions -> questions ->
-- topic_id. That join only ever sees rows the querying client's RLS
-- policies already expose, which hides a locked premium package's
-- package_questions/questions content from a user who has no access to
-- it yet -- so a topic with five premium packages and one free one would
-- silently show only the one the user can already see, defeating the
-- entire point of showing locked content to upsell. packages.topic_id
-- is package-level metadata (like package_type/difficulty_level), not
-- content, so it is visible under the same RLS a client already uses to
-- list a topic's packages at all (packages_select_published), regardless
-- of whether that user has access to what is inside.
--
-- Nullable, no default: every existing packages row keeps working
-- unmodified. Deneme (ZORLAYICI_DENEME) packages are a deliberate
-- application-level convention of topic_id = null (a Deneme package
-- spans every topic in the exam, so no single topic owns it) -- enforced
-- by the import-plan generator (tools/content/generate-question-import-sql.mjs)
-- and by product data-entry convention, not by a database CHECK
-- constraint, since nothing about the schema itself makes a
-- ZORLAYICI_DENEME package with a topic_id structurally invalid the way
-- a mismatched exam_id is.

alter table public.packages
  add column topic_id uuid references public.topics(id) on delete set null;

create index if not exists idx_packages_topic_id on public.packages(topic_id);

-- Integrity: a package's topic, when set, must belong to the same exam
-- as the package itself -- same shape as check_topic_parent_same_exam
-- and check_question_topic_same_exam in 20260702000001_content_model.sql.
create or replace function public.check_package_topic_same_exam()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  topic_exam_id uuid;
begin
  if new.topic_id is not null then
    select exam_id into topic_exam_id from public.topics where id = new.topic_id;
    if topic_exam_id is null then
      raise exception 'Topic % does not exist', new.topic_id;
    end if;
    if topic_exam_id != new.exam_id then
      raise exception 'Package topic must belong to the same exam (topic exam_id: %, package exam_id: %)',
        topic_exam_id, new.exam_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_packages_check_topic_same_exam on public.packages;

create trigger trg_packages_check_topic_same_exam
  before insert or update on public.packages
  for each row execute function public.check_package_topic_same_exam();
