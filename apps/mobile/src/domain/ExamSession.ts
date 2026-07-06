export type ExamSessionStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface ExamSession {
  id: string;
  userId: string;
  examId: string;
  packageId: string;
  status: ExamSessionStatus;
  startedAt: string;
  completedAt: string | null;
  score: number | null;
  passed: boolean | null;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

// id is client-generated and doubles as the idempotency key on sync.
export interface NewExamSession {
  id: string;
  userId: string;
  examId: string;
  packageId: string;
  startedAt: string;
}
