import type { Attempt, NewAttempt } from '../domain';

export interface AttemptRepository {
  create(attempt: NewAttempt): Promise<Attempt>;
  getByQuestion(userId: string, examId: string, questionId: string): Promise<Attempt[]>;
  // Needed to recompute topic-level accuracy after each Attempt.
  getByTopic(userId: string, examId: string, topicId: string): Promise<Attempt[]>;
  // Needed to score a completed Exam Session from its own Attempts.
  getBySession(examSessionId: string): Promise<Attempt[]>;
  // Needed for Home's "Son Aktivite" feed — practice/repeat/trial
  // attempts only (exam_session_id IS NULL); a Deneme's own per-question
  // attempts are already represented by its completed session, not here.
  getRecentStandalone(userId: string, limit: number): Promise<Attempt[]>;
  getUnsynced(): Promise<Attempt[]>;
  markSynced(ids: string[]): Promise<void>;
}
