import type { PackageRepository } from '../repositories/PackageRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';
import { resolvePackageAccessStatus, type PackageWithAccess } from './GetPackagesByExamUseCase';

export interface GetAllPackagesDeps {
  packageRepository: PackageRepository;
  entitlementRepository: EntitlementRepository;
}

// Backs the Denemeler tab's cross-exam browse view. Same access-status
// logic as GetPackagesByExamUseCase, just not scoped to one exam.
export class GetAllPackagesUseCase {
  constructor(private readonly deps: GetAllPackagesDeps) {}

  async execute(userId: string): Promise<PackageWithAccess[]> {
    const packages = await this.deps.packageRepository.getAll();

    return Promise.all(
      packages.map(async (pkg) => {
        const accessStatus = await resolvePackageAccessStatus(pkg, userId, this.deps);
        return { package: pkg, accessStatus, hasAccess: accessStatus === 'FULL' };
      }),
    );
  }
}
