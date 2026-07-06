import type { ExamSession, NewExamSession } from '../domain';

export interface ExamSessionRepository {
  create(session: NewExamSession): Promise<ExamSession>;
  update(session: ExamSession): Promise<ExamSession>;
  getActive(userId: string, examId: string): Promise<ExamSession | null>;
  getUnsynced(): Promise<ExamSession[]>;
  markSynced(ids: string[]): Promise<void>;
}
