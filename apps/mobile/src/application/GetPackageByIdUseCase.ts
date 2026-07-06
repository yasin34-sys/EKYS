import type { Package } from '../domain';
import type { PackageRepository } from '../repositories/PackageRepository';

export interface GetPackageByIdDeps {
  packageRepository: PackageRepository;
}

// Backs the Package Detail screen.
export class GetPackageByIdUseCase {
  constructor(private readonly deps: GetPackageByIdDeps) {}

  async execute(packageId: string): Promise<Package | null> {
    return this.deps.packageRepository.getById(packageId);
  }
}
