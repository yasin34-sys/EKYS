export type EntitlementStatus = 'ACTIVE' | 'PENDING' | 'REVOKED' | 'EXPIRED' | 'RESTORED';
export type EntitlementSource = 'APPLE' | 'GOOGLE' | 'ADMIN' | 'PROMOTION';

// PackageAccess is folded into Entitlement as a resolved list of
// accessible package ids, rather than exposed as its own repository.
export interface Entitlement {
  id: string;
  userId: string;
  examId: string;
  status: EntitlementStatus;
  source: EntitlementSource;
  packageIds: string[];
  grantedAt: string;
  createdAt: string;
  updatedAt: string;
}
