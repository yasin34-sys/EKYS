-- 20260702000005_package_free_tier.sql
-- Adds the free-tier marker to packages.
--
-- Free-tier access is a policy decision, not a license: it does not
-- go through Entitlement/PackageAccess. package_type remains purely a
-- study-mode descriptor (TEMEL_CALISMA/YOGUN_TEKRAR/ZORLAYICI_DENEME)
-- and is not overloaded to also mean "free" — this column is the only
-- thing that means that. Checked directly by the RLS policies in
-- 20260702000006_rls_policies.sql, as a path fully independent of the
-- active-entitlement path.

alter table packages add column is_free_tier boolean not null default false;
