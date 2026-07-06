import type { Entitlement } from '../domain';

export interface EntitlementRepository {
  getForUser(userId: string): Promise<Entitlement[]>;
  hasAccess(userId: string, packageId: string): Promise<boolean>;
}
