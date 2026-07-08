import type { DB } from '@op-engineering/op-sqlite';
import type { ExamSession, ExamSessionStatus, NewExamSession } from '../../domain';
import type { ExamSessionRepository } from '../ExamSessionRepository';
import { IntegrityViolationError, NotFoundError } from '../errors';

interface ExamSessionRow {
  id: string;
  user_id: string;
  exam_id: string;
  package_id: string;
  status: ExamSessionStatus;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  passed: number | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

function mapExamSessionRow(row: ExamSessionRow): ExamSession {
  return {
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    packageId: row.package_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    score: row.score,
    passed: row.passed === null ? null : row.passed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

export class SqliteExamSessionRepository implements ExamSessionRepository {
  constructor(private readonly db: DB) {}

  async create(session: NewExamSession): Promise<ExamSession> {
    try {
      await this.db.execute(
        `INSERT INTO exam_sessions (id, user_id, exam_id, package_id, started_at)
         VALUES (?, ?, ?, ?, ?);`,
        [session.id, session.userId, session.examId, session.packageId, session.startedAt],
      );
    } catch (cause) {
      throw new IntegrityViolationError('Failed to create exam session', cause);
    }
    const result = await this.db.execute(`SELECT * FROM exam_sessions WHERE id = ?;`, [
      session.id,
    ]);
    return mapExamSessionRow((result.rows as unknown as ExamSessionRow[])[0]);
  }

  // Only status/completedAt/score/passed are meaningfully updated —
  // matches trg_exam_sessions_set_updated_at's watched column list. The
  // approved IN_PROGRESS -> COMPLETED/ABANDONED state machine is
  // enforced by trg_exam_sessions_check_status_transition at the
  // database level; an invalid transition surfaces here as an
  // IntegrityViolationError, not re-validated in application code.
  async update(session: ExamSession): Promise<ExamSession> {
    try {
      await this.db.execute(
        `UPDATE exam_sessions
         SET status = ?, completed_at = ?, score = ?, passed = ?
         WHERE id = ?;`,
        [
          session.status,
          session.completedAt,
          session.score,
          session.passed === null ? null : session.passed ? 1 : 0,
          session.id,
        ],
      );
    } catch (cause) {
      throw new IntegrityViolationError('Failed to update exam session', cause);
    }
    const result = await this.db.execute(`SELECT * FROM exam_sessions WHERE id = ?;`, [
      session.id,
    ]);
    const row = (result.rows as unknown as ExamSessionRow[])[0];
    if (!row) throw new NotFoundError('ExamSession', session.id);
    return mapExamSessionRow(row);
  }

  async getActive(userId: string, examId: string): Promise<ExamSession | null> {
    const result = await this.db.execute(
      `SELECT * FROM exam_sessions
       WHERE user_id = ? AND exam_id = ? AND status = 'IN_PROGRESS'
       ORDER BY started_at DESC LIMIT 1;`,
      [userId, examId],
    );
    const row = (result.rows as unknown as ExamSessionRow[])[0];
    return row ? mapExamSessionRow(row) : null;
  }

  async getRecentCompleted(userId: string, limit: number): Promise<ExamSession[]> {
    const result = await this.db.execute(
      `SELECT * FROM exam_sessions
       WHERE user_id = ? AND status = 'COMPLETED'
       ORDER BY completed_at DESC LIMIT ?;`,
      [userId, limit],
    );
    return (result.rows as unknown as ExamSessionRow[]).map(mapExamSessionRow);
  }

  async getUnsynced(): Promise<ExamSession[]> {
    const result = await this.db.execute(
      `SELECT * FROM exam_sessions WHERE synced_at IS NULL ORDER BY created_at ASC;`,
    );
    return (result.rows as unknown as ExamSessionRow[]).map(mapExamSessionRow);
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await this.db.execute(
      `UPDATE exam_sessions SET synced_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id IN (${placeholders});`,
      ids,
    );
  }
}
