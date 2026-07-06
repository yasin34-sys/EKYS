import type { DB } from '@op-engineering/op-sqlite';
import type { RepeatPoolEntry } from '../../domain';
import type { RepeatPoolRepository } from '../RepeatPoolRepository';

interface RepeatPoolRow {
  user_id: string;
  exam_id: string;
  question_id: string;
  attempt_id: string;
}

function mapRepeatPoolRow(row: RepeatPoolRow): RepeatPoolEntry {
  return {
    userId: row.user_id,
    examId: row.exam_id,
    questionId: row.question_id,
    attemptId: row.attempt_id,
  };
}

// Read-only: queries the repeat_pool view, never writes to it — Repeat
// Pool is derived data with no backing table.
export class SqliteRepeatPoolRepository implements RepeatPoolRepository {
  constructor(private readonly db: DB) {}

  async getForUser(userId: string, examId: string): Promise<RepeatPoolEntry[]> {
    const result = await this.db.execute(
      `SELECT * FROM repeat_pool WHERE user_id = ? AND exam_id = ?;`,
      [userId, examId],
    );
    return (result.rows as unknown as RepeatPoolRow[]).map(mapRepeatPoolRow);
  }
}
