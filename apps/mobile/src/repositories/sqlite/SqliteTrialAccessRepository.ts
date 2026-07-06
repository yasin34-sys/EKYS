import type { DB } from '@op-engineering/op-sqlite';
import type { TrialAccessRepository } from '../TrialAccessRepository';

export class SqliteTrialAccessRepository implements TrialAccessRepository {
  constructor(private readonly db: DB) {}

  async hasGrant(userId: string, questionId: string): Promise<boolean> {
    const result = await this.db.execute(
      `SELECT 1 FROM trial_access WHERE user_id = ? AND question_id = ? LIMIT 1;`,
      [userId, questionId],
    );
    return result.rows.length > 0;
  }

  async getGrantedCount(userId: string): Promise<number> {
    const result = await this.db.execute(
      `SELECT COUNT(*) as count FROM trial_access WHERE user_id = ?;`,
      [userId],
    );
    const row = (result.rows as unknown as { count: number }[])[0];
    return row?.count ?? 0;
  }

  async hasAnyGrantForPackage(userId: string, packageId: string): Promise<boolean> {
    const result = await this.db.execute(
      `SELECT 1
       FROM trial_access ta
       INNER JOIN package_questions pq ON pq.question_id = ta.question_id
       WHERE ta.user_id = ? AND pq.package_id = ?
       LIMIT 1;`,
      [userId, packageId],
    );
    return result.rows.length > 0;
  }
}
