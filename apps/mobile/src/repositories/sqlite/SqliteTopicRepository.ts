import type { DB } from '@op-engineering/op-sqlite';
import type { Topic, TopicStatus } from '../../domain';
import type { TopicRepository } from '../TopicRepository';

interface TopicRow {
  id: string;
  exam_id: string;
  parent_topic_id: string | null;
  name: string;
  display_order: number;
  status: TopicStatus;
  created_at: string;
  updated_at: string;
}

function mapTopicRow(row: TopicRow): Topic {
  return {
    id: row.id,
    examId: row.exam_id,
    parentTopicId: row.parent_topic_id,
    name: row.name,
    displayOrder: row.display_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteTopicRepository implements TopicRepository {
  constructor(private readonly db: DB) {}

  async getByExam(examId: string): Promise<Topic[]> {
    const result = await this.db.execute(
      `SELECT * FROM topics WHERE exam_id = ? ORDER BY display_order ASC;`,
      [examId],
    );
    return (result.rows as unknown as TopicRow[]).map(mapTopicRow);
  }
}
