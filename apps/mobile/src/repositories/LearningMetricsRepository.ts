import type { LearningMetric, NewLearningMetric } from '../domain';

export interface LearningMetricsRepository {
  upsert(metric: NewLearningMetric): Promise<LearningMetric>;
  getForUser(userId: string, examId: string, topicId?: string): Promise<LearningMetric[]>;
  getUnsynced(): Promise<LearningMetric[]>;
  markSynced(ids: string[]): Promise<void>;
}
