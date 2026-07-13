import type { Package } from '../domain';
import type { PackageRepository } from '../repositories/PackageRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';

export type PackageAccessStatus = 'FULL' | 'PREMIUM' | 'LOCKED';

export interface PackageWithAccess {
  package: Package;
  accessStatus: PackageAccessStatus;
  // Preserved for existing call sites: true only when the user can read
  // the package's full content through the normal eager package flow.
  // PREMIUM and LOCKED are browse/paywall states, not access states.
  hasAccess: boolean;
}

export interface GetPackagesByExamDeps {
  packageRepository: PackageRepository;
  entitlementRepository: EntitlementRepository;
}

// Shared by GetPackagesByExamUseCase, GetAllPackagesUseCase, and
// GetPackagesByTopicUseCase so the access-status priority order is
// defined exactly once.
//
// Product model (Phase 8B): published non-free packages are Premium
// membership content. Trial rows may still exist for legacy/lazy trial
// internals, but normal package browsing advertises these packages through
// the Premium paywall path instead of a trial CTA.
export async function resolvePackageAccessStatus(
  pkg: Package,
  userId: string,
  deps: { entitlementRepository: EntitlementRepository },
): Promise<PackageAccessStatus> {
  if (pkg.isFreeTier) return 'FULL';
  if (await deps.entitlementRepository.hasAccess(userId, pkg.id)) return 'FULL';
  if (pkg.status !== 'PUBLISHED') return 'LOCKED';
  return 'PREMIUM';
}

// Returns every Package for the exam (including ones the user doesn't
// have access to) annotated with accessStatus/hasAccess. Browsing locked
// premium content is part of the paywall flow, not just listing what's
// already unlocked.
export class GetPackagesByExamUseCase {
  constructor(private readonly deps: GetPackagesByExamDeps) {}

  async execute(userId: string, examId: string): Promise<PackageWithAccess[]> {
    const packages = await this.deps.packageRepository.getByExam(examId);

    return Promise.all(
      packages.map(async (pkg) => {
        const accessStatus = await resolvePackageAccessStatus(pkg, userId, this.deps);
        return { package: pkg, accessStatus, hasAccess: accessStatus === 'FULL' };
      }),
    );
  }
}
