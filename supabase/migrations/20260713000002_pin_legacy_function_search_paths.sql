-- Pin search_path for legacy trigger/helper functions created before the
-- project standardized function search paths. These functions are not
-- SECURITY DEFINER, but explicit name resolution still avoids temp-schema
-- shadowing and clears Supabase's function_search_path_mutable advisor.

alter function public.check_package_question_same_exam()
  set search_path = public, pg_temp;

alter function public.check_topic_parent_same_exam()
  set search_path = public, pg_temp;

alter function public.check_question_topic_same_exam()
  set search_path = public, pg_temp;

alter function public.check_package_access_same_exam()
  set search_path = public, pg_temp;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.check_attempt_integrity()
  set search_path = public, pg_temp;

alter function public.check_learning_metric_topic_same_exam()
  set search_path = public, pg_temp;
