import type { PackageRepository } from '../repositories/PackageRepository';
import type { EntitlementRepository } from '../repositories/EntitlementRepository';
import type { TrialAccessRepository } from '../repositories/TrialAccessRepository';
import { resolvePackageAccessStatus, type PackageWithAccess } from './GetPackagesByExamUseCase';

export interface GetPackagesByTopicDeps {
  packageRepository: PackageRepository;
  entitlementRepository: EntitlementRepository;
  trialAccessRepository: TrialAccessRepository;
}

// Topic Detail screen (Phase 8A.1, corrected 8A.2). Mirrors
// GetPackagesByExamUseCase's access-status resolution exactly (same
// resolvePackageAccessStatus helper), scoped down through package-level
// topic_id metadata rather than package_questions/questions. That is
// intentional: locked premium packages must still appear under their
// topic even when the current user cannot read their content rows yet.
// Callers pass the topic's own id plus any descendants.
export class GetPackagesByTopicUseCase {
  constructor(private readonly deps: GetPackagesByTopicDeps) {}

  async execute(userId: string, topicIds: string[]): Promise<PackageWithAccess[]> {
    if (topicIds.length === 0) return [];
    const packages = await this.deps.packageRepository.getByTopicIds(topicIds);
    const grantedCount = await this.deps.trialAccessRepository.getGrantedCount(userId);

    return Promise.all(
      packages.map(async (pkg) => {
        const accessStatus = await resolvePackageAccessStatus(pkg, userId, grantedCount, this.deps);
        return { package: pkg, accessStatus, hasAccess: accessStatus === 'FULL' };
      }),
    );
  }
}
