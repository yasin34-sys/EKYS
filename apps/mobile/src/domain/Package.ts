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
  // Optional user-facing display fields (Phase 7A.3.2). null means "no
  // curated title/description yet" — callers must fall back to a
  // package_type-derived label, never render null/blank text directly.
  title: string | null;
  description: string | null;
  // Which topic this package belongs to (Phase 8A.2). Package-level
  // metadata, independent of package_questions/questions — this is what
  // lets Topic Detail show a topic's locked premium packages too, not
  // only the ones this device/user already has content-level visibility
  // into. Always null for ZORLAYICI_DENEME (Deneme) packages, which
  // deliberately span every topic in the exam rather than belonging to
  // one.
  topicId: string | null;
  createdAt: string;
  updatedAt: string;
}
