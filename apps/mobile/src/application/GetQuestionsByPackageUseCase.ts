import type { Question } from '../domain';
import type { QuestionRepository } from '../repositories/QuestionRepository';

export interface GetQuestionsByPackageDeps {
  questionRepository: QuestionRepository;
}

// Drives the Question Screen loop. Deliberately does not re-check
// entitlement here — that gate already lives at Package Detail's CTA
// (only reachable when hasAccess is true) and, independently, at the
// server via RLS. Duplicating the check here would be a second source
// of truth for the same rule.
export class GetQuestionsByPackageUseCase {
  constructor(private readonly deps: GetQuestionsByPackageDeps) {}

  async execute(packageId: string): Promise<Question[]> {
    return this.deps.questionRepository.getByPackage(packageId);
  }
}
