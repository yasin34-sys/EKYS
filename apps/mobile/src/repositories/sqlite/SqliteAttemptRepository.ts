import type { DB } from '@op-engineering/op-sqlite';
import type { Attempt, NewAttempt } from '../../domain';
import type { AttemptRepository } from '../AttemptRepository';
import { IntegrityViolationError } from '../errors';

interface AttemptRow {
  id: string;
  user_id: string;
  exam_id: string;
  question_id: string;
  exam_session_id: string | null;
  sequence: number | null;
  selected_option_id: string;
  is_correct: number;
  server_verified_correct: number | null;
  server_verified_at: string | null;
  answered_at: string;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

function mapAttemptRow(row: AttemptRow): Attempt {
  return {
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    questionId: row.question_id,
    examSessionId: row.exam_session_id,
    sequence: row.sequence,
    selectedOptionId: row.selected_option_id,
    isCorrect: row.is_correct === 1,
    serverVerifiedCorrect:
      row.server_verified_correct === null ? null : row.server_verified_correct === 1,
    serverVerifiedAt: row.server_verified_at,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

export class SqliteAttemptRepository implements AttemptRepository {
  constructor(private readonly db: DB) {}

  // Insert-only: this Repository never issues an UPDATE against
  // attempts, mirroring the server's immutability posture. Same-exam/
  // same-question/same-session integrity is enforced by
  // trg_attempts_check_integrity at the database level; a violation
  // surfaces here as an IntegrityViolationError, not a raw SQL error.
  async create(attempt: NewAttempt): Promise<Attempt> {
    try {
      await this.db.execute(
        `INSERT INTO attempts (
           id, user_id, exam_id, question_id, exam_session_id, sequence,
           selected_option_id, is_correct, answered_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          attempt.id,
          attempt.userId,
          attempt.examId,
          attempt.questionId,
          attempt.examSessionId,
          attempt.sequence,
          attempt.selectedOptionId,
          attempt.isCorrect ? 1 : 0,
          attempt.answeredAt,
        ],
      );
    } catch (cause) {
      throw new IntegrityViolationError('Failed to create attempt', cause);
    }

    const result = await this.db.execute(`SELECT * FROM attempts WHERE id = ?;`, [attempt.id]);
    return mapAttemptRow((result.rows as unknown as AttemptRow[])[0]);
  }

  async getByQuestion(userId: string, examId: string, questionId: string): Promise<Attempt[]> {
    const result = await this.db.execute(
      `SELECT * FROM attempts
       WHERE user_id = ? AND exam_id = ? AND question_id = ?
       ORDER BY answered_at DESC;`,
      [userId, examId, questionId],
    );
    return (result.rows as unknown as AttemptRow[]).map(mapAttemptRow);
  }

  async getByTopic(userId: string, examId: string, topicId: string): Promise<Attempt[]> {
    const result = await this.db.execute(
      `SELECT a.* FROM attempts a
       INNER JOIN questions q ON q.id = a.question_id
       WHERE a.user_id = ? AND a.exam_id = ? AND q.topic_id = ?
       ORDER BY a.answered_at DESC;`,
      [userId, examId, topicId],
    );
    return (result.rows as unknown as AttemptRow[]).map(mapAttemptRow);
  }

  async getBySession(examSessionId: string): Promise<Attempt[]> {
    const result = await this.db.execute(
      `SELECT * FROM attempts WHERE exam_session_id = ? ORDER BY sequence ASC;`,
      [examSessionId],
    );
    return (result.rows as unknown as AttemptRow[]).map(mapAttemptRow);
  }

  async getUnsynced(): Promise<Attempt[]> {
    const result = await this.db.execute(
      `SELECT * FROM attempts WHERE synced_at IS NULL ORDER BY created_at ASC;`,
    );
    return (result.rows as unknown as AttemptRow[]).map(mapAttemptRow);
  }

  // Only called by PushSync after a confirmed successful server
  // response for each id — never speculatively. synced_at is not in
  // trg_attempts_set_updated_at's watched column list, so this does
  // not touch updated_at.
  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await this.db.execute(
      `UPDATE attempts SET synced_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id IN (${placeholders});`,
      ids,
    );
  }
}
