// metric_type is plain text, not a fixed union — no metric_types
// reference table exists (removed from MVP scope during the schema
// review), so it is intentionally typed as string here rather than a
// closed set of literals.
export interface LearningMetric {
  id: string;
  userId: string;
  examId: string;
  topicId: string | null;
  metricType: string;
  value: number;
  computedFrom: string | null;
  computedTo: string | null;
  computedAt: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

// LearningMetric is current-cached-state, upserted by (userId, examId,
// topicId, metricType) — there is no separate "update" shape, upsert
// takes the same fields as creation.
export interface NewLearningMetric {
  id: string;
  userId: string;
  examId: string;
  topicId: string | null;
  metricType: string;
  value: number;
  computedFrom: string | null;
  computedTo: string | null;
}
