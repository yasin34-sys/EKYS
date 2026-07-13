import type { DB } from '@op-engineering/op-sqlite';
import type { Entitlement, EntitlementSource, EntitlementStatus } from '../../domain';
import type { EntitlementRepository } from '../EntitlementRepository';

interface EntitlementRow {
  id: string;
  user_id: string;
  exam_id: string;
  status: EntitlementStatus;
  source: EntitlementSource;
  granted_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PackageAccessRow {
  entitlement_id: string;
  package_id: string;
}

function mapEntitlementRow(row: EntitlementRow, packageIds: string[]): Entitlement {
  return {
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    status: row.status,
    source: row.source,
    packageIds,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteEntitlementRepository implements EntitlementRepository {
  constructor(private readonly db: DB) {}

  // PackageAccess is folded into Entitlement.packageIds here — batched
  // in one extra query rather than one per entitlement.
  async getForUser(userId: string): Promise<Entitlement[]> {
    const entitlementsResult = await this.db.execute(
      `SELECT * FROM entitlements WHERE user_id = ?;`,
      [userId],
    );
    const rows = entitlementsResult.rows as unknown as EntitlementRow[];
    if (rows.length === 0) return [];

    const placeholders = rows.map(() => '?').join(', ');
    const accessResult = await this.db.execute(
      `SELECT entitlement_id, package_id FROM package_access WHERE entitlement_id IN (${placeholders});`,
      rows.map((row) => row.id),
    );
    const accessRows = accessResult.rows as unknown as PackageAccessRow[];

    const packageIdsByEntitlementId = new Map<string, string[]>();
    for (const accessRow of accessRows) {
      const list = packageIdsByEntitlementId.get(accessRow.entitlement_id) ?? [];
      list.push(accessRow.package_id);
      packageIdsByEntitlementId.set(accessRow.entitlement_id, list);
    }

    return rows.map((row) => mapEntitlementRow(row, packageIdsByEntitlementId.get(row.id) ?? []));
  }

  // Scoped to current ACTIVE entitlements: PENDING/REVOKED/EXPIRED/
  // RESTORED do not grant access, and a timed entitlement stops granting
  // access once expires_at is in the past. Null expires_at is kept as the
  // legacy/lifetime/admin entitlement shape.
  async hasAccess(userId: string, packageId: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.db.execute(
      `SELECT 1 FROM entitlements e
       INNER JOIN package_access pa ON pa.entitlement_id = e.id
       WHERE e.user_id = ?
         AND pa.package_id = ?
         AND e.status = 'ACTIVE'
         AND (e.expires_at IS NULL OR e.expires_at > ?)
       LIMIT 1;`,
      [userId, packageId, now],
    );
    return result.rows.length > 0;
  }
}
