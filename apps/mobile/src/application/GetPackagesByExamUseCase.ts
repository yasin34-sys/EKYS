import type { Package } from '../domain';
import type { PackageRepository } from '../repositories/PackageRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';
import type { TrialAccessRepository } from '../repositories/TrialAccessRepository';

// Must match check_trial_access_grant()'s cap
// (supabase/migrations/20260706000001_trial_access.sql) — duplicated
// here only for UI-state purposes (deciding TRIAL vs LOCKED), never as
// an enforcement point. The actual cap is enforced exclusively
// server-side; this value being out of sync with the trigger would
// only ever produce a stale-looking access status, never a security
// issue, since the trigger re-validates independently on every grant
// attempt regardless of what this constant says.
const TRIAL_GRANT_CAP = 100;

export type PackageAccessStatus = 'FULL' | 'TRIAL' | 'LOCKED';

export interface PackageWithAccess {
  package: Package;
  accessStatus: PackageAccessStatus;
  // Preserved for existing call sites — deliberately narrower than
  // accessStatus, not a duplicate of it. hasAccess is true iff
  // accessStatus === 'FULL'. TRIAL is intentionally NOT treated as
  // hasAccess: the existing Practice flow (GetQuestionsByPackageUseCase)
  // eagerly loads a package's entire question list in one call, which
  // is exactly the wrong behavior for a metered trial — until the lazy
  // per-question flow (a later phase) exists to replace it, a TRIAL
  // package must keep behaving like LOCKED everywhere hasAccess is the
  // thing being read.
  hasAccess: boolean;
}

export interface GetPackagesByExamDeps {
  packageRepository: PackageRepository;
  entitlementRepository: EntitlementRepository;
  trialAccessRepository: TrialAccessRepository;
}

// Shared by GetPackagesByExamUseCase and GetAllPackagesUseCase so the
// access-status priority order is defined exactly once. grantedCount is
// passed in rather than fetched here — it's the same value for every
// package a given user has, so callers fetch it once per execute() call
// and reuse it across the whole package list, not once per package.
//
// Priority order:
// 1. is_free_tier -> FULL. Permanent, unlimited, unrelated to the trial
//    mechanism entirely.
// 2. Active entitlement -> FULL.
// 3. ZORLAYICI_DENEME (Deneme) -> LOCKED if neither of the above apply.
//    Deneme is explicitly excluded from the trial mechanism (product
//    decision, Phase 2B.4) — it is never TRIAL, only FULL or LOCKED.
// 4. TEMEL_CALISMA / YOGUN_TEKRAR: TRIAL if the user's total trial
//    grant count is under the cap; if the cap is already reached, still
//    TRIAL if the user already holds a grant for a question currently
//    in *this* package (so a package they were mid-trial-in when the
//    cap hit stays enterable to review what they already have),
//    otherwise LOCKED.
export async function resolvePackageAccessStatus(
  pkg: Package,
  userId: string,
  grantedCount: number,
  deps: { entitlementRepository: EntitlementRepository; trialAccessRepository: TrialAccessRepository },
): Promise<PackageAccessStatus> {
  if (pkg.isFreeTier) return 'FULL';
  if (await deps.entitlementRepository.hasAccess(userId, pkg.id)) return 'FULL';
  if (pkg.packageType === 'ZORLAYICI_DENEME') return 'LOCKED';
  if (grantedCount < TRIAL_GRANT_CAP) return 'TRIAL';
  if (await deps.trialAccessRepository.hasAnyGrantForPackage(userId, pkg.id)) return 'TRIAL';
  return 'LOCKED';
}

// Returns every Package for the exam (including ones the user doesn't
// have access to) annotated with accessStatus/hasAccess — browsing
// what's locked is part of the paywall flow, not just listing what's
// already unlocked.
export class GetPackagesByExamUseCase {
  constructor(private readonly deps: GetPackagesByExamDeps) {}

  async execute(userId: string, examId: string): Promise<PackageWithAccess[]> {
    const packages = await this.deps.packageRepository.getByExam(examId);
    const grantedCount = await this.deps.trialAccessRepository.getGrantedCount(userId);

    return Promise.all(
      packages.map(async (pkg) => {
        const accessStatus = await resolvePackageAccessStatus(pkg, userId, grantedCount, this.deps);
        return { package: pkg, accessStatus, hasAccess: accessStatus === 'FULL' };
      }),
    );
  }
}
