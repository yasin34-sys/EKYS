import type { DB } from '@op-engineering/op-sqlite';
import type { LearningMetric, NewLearningMetric } from '../../domain';
import type { LearningMetricsRepository } from '../LearningMetricsRepository';
import { IntegrityViolationError } from '../errors';

interface LearningMetricRow {
  id: string;
  user_id: string;
  exam_id: string;
  topic_id: string | null;
  metric_type: string;
  value: number;
  computed_from: string | null;
  computed_to: string | null;
  computed_at: string;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

function mapLearningMetricRow(row: LearningMetricRow): LearningMetric {
  return {
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    topicId: row.topic_id,
    metricType: row.metric_type,
    value: row.value,
    computedFrom: row.computed_from,
    computedTo: row.computed_to,
    computedAt: row.computed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at,
  };
}

export class SqliteLearningMetricsRepository implements LearningMetricsRepository {
  constructor(private readonly db: DB) {}

  // Current-cached-state, not append-only: upserted by
  // (userId, examId, topicId, metricType). There are two different
  // partial unique indexes in the schema (topic-scoped vs. exam-wide,
  // since NULL != NULL means a single plain unique constraint couldn't
  // cover both), so the ON CONFLICT target must branch on whether
  // topicId is null to match the correct index.
  async upsert(metric: NewLearningMetric): Promise<LearningMetric> {
    const conflictClause =
      metric.topicId !== null
        ? `ON CONFLICT (user_id, exam_id, topic_id, metric_type) WHERE topic_id IS NOT NULL DO UPDATE SET
             value = excluded.value,
             computed_from = excluded.computed_from,
             computed_to = excluded.computed_to,
             computed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
        : `ON CONFLICT (user_id, exam_id, metric_type) WHERE topic_id IS NULL DO UPDATE SET
             value = excluded.value,
             computed_from = excluded.computed_from,
             computed_to = excluded.computed_to,
             computed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`;

    try {
      await this.db.execute(
        `INSERT INTO learning_metrics (
           id, user_id, exam_id, topic_id, metric_type, value, computed_from, computed_to
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ${conflictClause};`,
        [
          metric.id,
          metric.userId,
          metric.examId,
          metric.topicId,
          metric.metricType,
          metric.value,
          metric.computedFrom,
          metric.computedTo,
        ],
      );
    } catch (cause) {
      throw new IntegrityViolationError('Failed to upsert learning metric', cause);
    }

    // id is deliberately not part of DO UPDATE SET above: on conflict,
    // the original row's id persists rather than being replaced by the
    // new INSERT attempt's id, since id is not part of a
    // LearningMetric's logical identity (the (user, exam, topic,
    // metricType) tuple is) — so the lookup below is by that tuple, not
    // by metric.id, which may not be the row's actual id after an
    // update-path upsert.
    const result =
      metric.topicId !== null
        ? await this.db.execute(
            `SELECT * FROM learning_metrics WHERE user_id = ? AND exam_id = ? AND topic_id = ? AND metric_type = ?;`,
            [metric.userId, metric.examId, metric.topicId, metric.metricType],
          )
        : await this.db.execute(
            `SELECT * FROM learning_metrics WHERE user_id = ? AND exam_id = ? AND topic_id IS NULL AND metric_type = ?;`,
            [metric.userId, metric.examId, metric.metricType],
          );

    return mapLearningMetricRow((result.rows as unknown as LearningMetricRow[])[0]);
  }

  async getForUser(userId: string, examId: string, topicId?: string): Promise<LearningMetric[]> {
    const result =
      topicId !== undefined
        ? await this.db.execute(
            `SELECT * FROM learning_metrics WHERE user_id = ? AND exam_id = ? AND topic_id = ?;`,
            [userId, examId, topicId],
          )
        : await this.db.execute(
            `SELECT * FROM learning_metrics WHERE user_id = ? AND exam_id = ?;`,
            [userId, examId],
          );
    return (result.rows as unknown as LearningMetricRow[]).map(mapLearningMetricRow);
  }

  async getUnsynced(): Promise<LearningMetric[]> {
    const result = await this.db.execute(
      `SELECT * FROM learning_metrics WHERE synced_at IS NULL ORDER BY created_at ASC;`,
    );
    return (result.rows as unknown as LearningMetricRow[]).map(mapLearningMetricRow);
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(', ');
    await this.db.execute(
      `UPDATE learning_metrics SET synced_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id IN (${placeholders});`,
      ids,
    );
  }
}
