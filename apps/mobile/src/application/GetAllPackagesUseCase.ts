import type { PackageRepository } from '../repositories/PackageRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';
import type { TrialAccessRepository } from '../repositories/TrialAccessRepository';
import { resolvePackageAccessStatus, type PackageWithAccess } from './GetPackagesByExamUseCase';

export interface GetAllPackagesDeps {
  packageRepository: PackageRepository;
  entitlementRepository: EntitlementRepository;
  trialAccessRepository: TrialAccessRepository;
}

// Backs the Packages tab's cross-exam browse view. Same access-status
// logic as GetPackagesByExamUseCase (reusing its resolvePackageAccessStatus
// helper and PackageWithAccess type rather than redefining either) —
// just not scoped to one exam.
export class GetAllPackagesUseCase {
  constructor(private readonly deps: GetAllPackagesDeps) {}

  async execute(userId: string): Promise<PackageWithAccess[]> {
    const packages = await this.deps.packageRepository.getAll();
    const grantedCount = await this.deps.trialAccessRepository.getGrantedCount(userId);

    return Promise.all(
      packages.map(async (pkg) => {
        const accessStatus = await resolvePackageAccessStatus(pkg, userId, grantedCount, this.deps);
        return { package: pkg, accessStatus, hasAccess: accessStatus === 'FULL' };
      }),
    );
  }
}
