import type { PackageRepository } from '../repositories/PackageRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';
import { resolvePackageAccessStatus, type PackageWithAccess } from './GetPackagesByExamUseCase';

export interface GetPackagesByTopicDeps {
  packageRepository: PackageRepository;
  entitlementRepository: EntitlementRepository;
}

// Topic Detail screen (Phase 8A.1, corrected 8A.2). Mirrors
// GetPackagesByExamUseCase's access-status resolution exactly, scoped
// through package-level topic_id metadata. Locked premium packages must
// still appear under their topic even when the current user cannot read
// their content rows yet. Callers pass the topic's own id plus any
// descendants.
export class GetPackagesByTopicUseCase {
  constructor(private readonly deps: GetPackagesByTopicDeps) {}

  async execute(userId: string, topicIds: string[]): Promise<PackageWithAccess[]> {
    if (topicIds.length === 0) return [];
    const packages = await this.deps.packageRepository.getByTopicIds(topicIds);

    return Promise.all(
      packages.map(async (pkg) => {
        const accessStatus = await resolvePackageAccessStatus(pkg, userId, this.deps);
        return { package: pkg, accessStatus, hasAccess: accessStatus === 'FULL' };
      }),
    );
  }
}
