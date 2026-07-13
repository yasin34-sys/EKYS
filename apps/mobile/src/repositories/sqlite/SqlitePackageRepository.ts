import type { DB } from '@op-engineering/op-sqlite';
import type { DifficultyLevel, Package, PackageStatus, PackageType } from '../../domain';
import type { PackageRepository } from '../PackageRepository';

interface PackageRow {
  id: string;
  exam_id: string;
  package_type: PackageType;
  difficulty_level: DifficultyLevel;
  version: number;
  checksum: string | null;
  is_free_tier: number;
  status: PackageStatus;
  title: string | null;
  description: string | null;
  topic_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapPackageRow(row: PackageRow): Package {
  return {
    id: row.id,
    examId: row.exam_id,
    packageType: row.package_type,
    difficultyLevel: row.difficulty_level,
    version: row.version,
    checksum: row.checksum,
    isFreeTier: row.is_free_tier === 1,
    status: row.status,
    // `?? null` (Phase 7A.3.2.1, extended 8A.2 to topic_id): defensive
    // against a row object that ever lacks these keys entirely (e.g.
    // `SELECT *` against a device whose local upgrade guard — see
    // sqlite.ts — hasn't run for some reason), where they'd read back
    // as `undefined` rather than `null`.
    title: row.title ?? null,
    description: row.description ?? null,
    topicId: row.topic_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqlitePackageRepository implements PackageRepository {
  constructor(private readonly db: DB) {}

  async getByExam(examId: string): Promise<Package[]> {
    const result = await this.db.execute(
      `SELECT * FROM packages WHERE exam_id = ? ORDER BY package_type ASC, difficulty_level ASC;`,
      [examId],
    );
    return (result.rows as unknown as PackageRow[]).map(mapPackageRow);
  }

  async getById(id: string): Promise<Package | null> {
    const result = await this.db.execute(`SELECT * FROM packages WHERE id = ? LIMIT 1;`, [id]);
    const row = (result.rows as unknown as PackageRow[])[0];
    return row ? mapPackageRow(row) : null;
  }

  async getAll(): Promise<Package[]> {
    const result = await this.db.execute(
      `SELECT * FROM packages WHERE status = 'PUBLISHED' ORDER BY exam_id ASC, package_type ASC, difficulty_level ASC;`,
    );
    return (result.rows as unknown as PackageRow[]).map(mapPackageRow);
  }

  async getByTopicIds(topicIds: string[]): Promise<Package[]> {
    if (topicIds.length === 0) return [];
    const placeholders = topicIds.map(() => '?').join(', ');
    const result = await this.db.execute(
      `SELECT * FROM packages
       WHERE topic_id IN (${placeholders})
       ORDER BY package_type ASC, difficulty_level ASC;`,
      topicIds,
    );
    return (result.rows as unknown as PackageRow[]).map(mapPackageRow);
  }
}
