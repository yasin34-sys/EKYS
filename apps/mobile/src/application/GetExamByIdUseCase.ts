import type { Exam } from '../domain';
import type { ExamRepository } from '../repositories/ExamRepository';

export interface GetExamByIdDeps {
  examRepository: ExamRepository;
}

// Backs the Exam Detail screen — GetPublishedExamsUseCase returns the
// full list, this fetches exactly one.
export class GetExamByIdUseCase {
  constructor(private readonly deps: GetExamByIdDeps) {}

  async execute(examId: string): Promise<Exam | null> {
    return this.deps.examRepository.getById(examId);
  }
}
