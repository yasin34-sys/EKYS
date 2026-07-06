import type { DB } from '@op-engineering/op-sqlite';
import type {
  Question,
  QuestionOption,
  QuestionOptionLabel,
  QuestionStatus,
  QuestionType,
} from '../../domain';
import type { QuestionRepository } from '../QuestionRepository';

interface QuestionRow {
  id: string;
  exam_id: string;
  topic_id: string;
  question_type: QuestionType;
  body: string;
  revision: number;
  status: QuestionStatus;
  created_at: string;
  updated_at: string;
}

interface QuestionOptionRow {
  id: string;
  question_id: string;
  label: QuestionOptionLabel;
  body: string;
  is_correct: number;
  display_order: number;
}

function mapQuestionOptionRow(row: QuestionOptionRow): QuestionOption {
  return {
    id: row.id,
    questionId: row.question_id,
    label: row.label,
    body: row.body,
    isCorrect: row.is_correct === 1,
    displayOrder: row.display_order,
  };
}

function mapQuestionRow(row: QuestionRow, options: QuestionOption[]): Question {
  return {
    id: row.id,
    examId: row.exam_id,
    topicId: row.topic_id,
    questionType: row.question_type,
    body: row.body,
    revision: row.revision,
    status: row.status,
    options,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteQuestionRepository implements QuestionRepository {
  constructor(private readonly db: DB) {}

  async getByPackage(packageId: string): Promise<Question[]> {
    const questionsResult = await this.db.execute(
      `SELECT q.* FROM questions q
       INNER JOIN package_questions pq ON pq.question_id = q.id
       WHERE pq.package_id = ?
       ORDER BY pq.display_order ASC;`,
      [packageId],
    );
    return this.attachOptions(questionsResult.rows as unknown as QuestionRow[]);
  }

  async getById(id: string): Promise<Question | null> {
    const result = await this.db.execute(`SELECT * FROM questions WHERE id = ? LIMIT 1;`, [id]);
    const row = (result.rows as unknown as QuestionRow[])[0];
    if (!row) return null;
    const [question] = await this.attachOptions([row]);
    return question;
  }

  // Batched to avoid N+1 queries: one extra query fetches options for
  // every question in the set, rather than one query per question.
  private async attachOptions(questionRows: QuestionRow[]): Promise<Question[]> {
    if (questionRows.length === 0) return [];

    const placeholders = questionRows.map(() => '?').join(', ');
    const optionsResult = await this.db.execute(
      `SELECT * FROM question_options WHERE question_id IN (${placeholders}) ORDER BY display_order ASC;`,
      questionRows.map((row) => row.id),
    );
    const optionRows = optionsResult.rows as unknown as QuestionOptionRow[];

    const optionsByQuestionId = new Map<string, QuestionOption[]>();
    for (const optionRow of optionRows) {
      const option = mapQuestionOptionRow(optionRow);
      const list = optionsByQuestionId.get(option.questionId) ?? [];
      list.push(option);
      optionsByQuestionId.set(option.questionId, list);
    }

    return questionRows.map((row) => mapQuestionRow(row, optionsByQuestionId.get(row.id) ?? []));
  }
}
