import type { ExamSession, NewExamSession } from '../domain';

export interface ExamSessionRepository {
  create(session: NewExamSession): Promise<ExamSession>;
  update(session: ExamSession): Promise<ExamSession>;
  getActive(userId: string, examId: string): Promise<ExamSession | null>;
  // Needed for Home's "Son Aktivite" feed — completed sessions only,
  // most-recent-first, capped by the caller's own limit.
  getRecentCompleted(userId: string, limit: number): Promise<ExamSession[]>;
  getUnsynced(): Promise<ExamSession[]>;
  markSynced(ids: string[]): Promise<void>;
}
