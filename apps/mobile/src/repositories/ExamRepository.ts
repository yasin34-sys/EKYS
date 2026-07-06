import type { Exam } from '../domain';

export interface ExamRepository {
  getPublished(): Promise<Exam[]>;
  getById(id: string): Promise<Exam | null>;
}
