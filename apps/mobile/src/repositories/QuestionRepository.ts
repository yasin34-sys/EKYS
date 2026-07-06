import type { Question } from '../domain';

export interface QuestionRepository {
  getByPackage(packageId: string): Promise<Question[]>;
  getById(id: string): Promise<Question | null>;
}
