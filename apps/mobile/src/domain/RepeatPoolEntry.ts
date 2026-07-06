// Repeat Pool is derived data, not a persistent entity — this type
// mirrors the repeat_pool view/query result, not a table row.
export interface RepeatPoolEntry {
  userId: string;
  examId: string;
  questionId: string;
  attemptId: string;
}
