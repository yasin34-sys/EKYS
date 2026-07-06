import type { Exam } from '../domain';
import type { ExamRepository } from '../repositories/ExamRepository';

export interface GetPublishedExamsDeps {
  examRepository: ExamRepository;
}

export class GetPublishedExamsUseCase {
  constructor(private readonly deps: GetPublishedExamsDeps) {}

  async execute(): Promise<Exam[]> {
    return this.deps.examRepository.getPublished();
  }
}
