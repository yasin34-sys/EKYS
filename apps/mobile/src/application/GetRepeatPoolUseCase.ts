import type { Question } from '../domain';
import type { RepeatPoolRepository } from '../repositories/RepeatPoolRepository';
import type { QuestionRepository } from '../repositories/QuestionRepository';

export interface GetRepeatPoolDeps {
  repeatPoolRepository: RepeatPoolRepository;
  questionRepository: QuestionRepository;
}

// Resolves derived Repeat Pool entries (bare ids) into full, renderable
// Question objects — a UI can't do anything useful with ids alone.
export class GetRepeatPoolUseCase {
  constructor(private readonly deps: GetRepeatPoolDeps) {}

  async execute(userId: string, examId: string): Promise<Question[]> {
    const entries = await this.deps.repeatPoolRepository.getForUser(userId, examId);

    const questions = await Promise.all(
      entries.map((entry) => this.deps.questionRepository.getById(entry.questionId)),
    );

    return questions.filter((question): question is Question => question !== null);
  }
}
