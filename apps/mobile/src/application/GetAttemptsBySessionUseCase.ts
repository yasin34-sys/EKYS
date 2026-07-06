import type { Attempt } from '../domain';
import type { AttemptRepository } from '../repositories/AttemptRepository';

export interface GetAttemptsBySessionDeps {
  attemptRepository: AttemptRepository;
}

// Backs Session Result's correct/wrong breakdown — wraps the existing
// AttemptRepository.getBySession(), which FinishExamSessionUseCase
// already uses internally for scoring.
export class GetAttemptsBySessionUseCase {
  constructor(private readonly deps: GetAttemptsBySessionDeps) {}

  async execute(examSessionId: string): Promise<Attempt[]> {
    return this.deps.attemptRepository.getBySession(examSessionId);
  }
}
