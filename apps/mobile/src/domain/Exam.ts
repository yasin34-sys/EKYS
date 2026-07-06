export type ExamStatus = 'DRAFT' | 'INTERNAL' | 'BETA' | 'PUBLISHED' | 'ARCHIVED';

export interface Exam {
  id: string;
  name: string;
  status: ExamStatus;
  questionCount: number;
  durationMinutes: number;
  passingScore: number;
  supersedesExamId: string | null;
  createdAt: string;
  updatedAt: string;
}
