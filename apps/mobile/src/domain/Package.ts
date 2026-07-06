export type PackageType = 'TEMEL_CALISMA' | 'YOGUN_TEKRAR' | 'ZORLAYICI_DENEME';
export type DifficultyLevel = 'KOLAY' | 'ORTA' | 'ZOR';
export type PackageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// PackageQuestion membership is folded into the Package/Question
// relationship rather than exposed as its own repository.
export interface Package {
  id: string;
  examId: string;
  packageType: PackageType;
  difficultyLevel: DifficultyLevel;
  version: number;
  checksum: string | null;
  // Free-tier access is a policy decision, not a license — never
  // inferred from Entitlement/PackageAccess. package_type stays purely
  // a study-mode descriptor.
  isFreeTier: boolean;
  status: PackageStatus;
  createdAt: string;
  updatedAt: string;
}
