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
}
