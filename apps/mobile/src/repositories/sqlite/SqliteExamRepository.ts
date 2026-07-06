import type { DB } from '@op-engineering/op-sqlite';
import type { Exam, ExamStatus } from '../../domain';
import type { ExamRepository } from '../ExamRepository';

interface ExamRow {
  id: string;
  name: string;
  status: ExamStatus;
  question_count: number;
  duration_minutes: number;
  passing_score: number;
  supersedes_exam_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapExamRow(row: ExamRow): Exam {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    questionCount: row.question_count,
    durationMinutes: row.duration_minutes,
    passingScore: row.passing_score,
    supersedesExamId: row.supersedes_exam_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteExamRepository implements ExamRepository {
  constructor(private readonly db: DB) {}

  async getPublished(): Promise<Exam[]> {
    const result = await this.db.execute(
      `SELECT * FROM exams WHERE status = ? ORDER BY name ASC;`,
      ['PUBLISHED'],
    );
    return (result.rows as unknown as ExamRow[]).map(mapExamRow);
  }

  async getById(id: string): Promise<Exam | null> {
    const result = await this.db.execute(`SELECT * FROM exams WHERE id = ? LIMIT 1;`, [id]);
    const row = (result.rows as unknown as ExamRow[])[0];
    return row ? mapExamRow(row) : null;
  }
}
