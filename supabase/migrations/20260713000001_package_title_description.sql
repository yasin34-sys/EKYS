-- 20260713000001_package_title_description.sql
-- Adds optional user-facing display fields to packages.
--
-- Problem: the UI currently derives package labels only from
-- package_type (e.g. "Zorlayıcı Deneme"), so multiple ZORLAYICI_DENEME
-- packages under the same exam (DENEME-001, DENEME-002, ...) render as
-- indistinguishable list rows. title/description let curated content
-- give a package its own display name/blurb, independent of
-- package_type/difficulty_level, which remain purely study-mode/access
-- descriptors (see 20260702000005_package_free_tier.sql's comment on
-- package_type not being overloaded).
--
-- Both columns are nullable with no default: every existing packages row
-- must keep working unmodified, and the client falls back to its
-- existing package_type-derived label whenever title is null (see
-- apps/mobile's packageTypeLabel usage). Never NOT NULL -- there is no
-- safe default value for a human-authored display title.

alter table packages add column title text;
alter table packages add column description text;
