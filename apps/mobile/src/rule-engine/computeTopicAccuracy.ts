// Pure function: no repository calls, no I/O, no framework knowledge.
// Callers (use cases) fetch the input data and persist the output —
// this module only computes.
//
// Deliberately minimal for MVP: accuracy = correct / total attempts
// for a topic. metric_type is free text specifically to allow more
// sophisticated rules (recency weighting, spaced-repetition intervals,
// etc.) to be added later as new metric types without a schema change
// — this is not meant to be the final learning algorithm, just the
// first, obviously-correct one.

export interface TopicAccuracyInput {
  topicId: string;
  attempts: Array<{ isCorrect: boolean }>;
}

export interface TopicAccuracyResult {
  topicId: string;
  metricType: 'TOPIC_ACCURACY';
  value: number; // 0..1
}

export function computeTopicAccuracy(input: TopicAccuracyInput): TopicAccuracyResult {
  const total = input.attempts.length;
  const correct = input.attempts.filter((attempt) => attempt.isCorrect).length;
  const value = total === 0 ? 0 : correct / total;

  return {
    topicId: input.topicId,
    metricType: 'TOPIC_ACCURACY',
    value,
  };
}
