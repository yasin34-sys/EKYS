import type { Attempt, NewAttempt } from '../domain';

export interface AttemptRepository {
  create(attempt: NewAttempt): Promise<Attempt>;
  getByQuestion(userId: string, examId: string, questionId: string): Promise<Attempt[]>;
  // Needed to recompute topic-level accuracy after each Attempt.
  getByTopic(userId: string, examId: string, topicId: string): Promise<Attempt[]>;
  // Needed to score a completed Exam Session from its own Attempts.
  getBySession(examSessionId: string): Promise<Attempt[]>;
  getUnsynced(): Promise<Attempt[]>;
  markSynced(ids: string[]): Promise<void>;
}
