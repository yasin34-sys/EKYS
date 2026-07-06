import type { LearningMetric } from '../domain';
import type { LearningMetricsRepository } from '../repositories/LearningMetricsRepository';

export interface DashboardMetrics {
  examWideMetrics: LearningMetric[];
  topicMetrics: LearningMetric[];
}

export interface GetDashboardMetricsDeps {
  learningMetricsRepository: LearningMetricsRepository;
}

// Minimal MVP shape: partitions the user's metrics into exam-wide vs.
// per-topic. Deliberately not a richer aggregation (trends, deltas) —
// that's a future extension once more metric_types exist to aggregate.
export class GetDashboardMetricsUseCase {
  constructor(private readonly deps: GetDashboardMetricsDeps) {}

  async execute(userId: string, examId: string): Promise<DashboardMetrics> {
    const all = await this.deps.learningMetricsRepository.getForUser(userId, examId);

    return {
      examWideMetrics: all.filter((metric) => metric.topicId === null),
      topicMetrics: all.filter((metric) => metric.topicId !== null),
    };
  }
}
