import type { ExamSession } from '../domain';
import type { ExamSessionRepository } from '../repositories/ExamSessionRepository';
import type { AttemptRepository } from '../repositories/AttemptRepository';
import type { ExamRepository } from '../repositories/ExamRepository';
import { NotFoundError } from '../repositories/errors';
import type { Clock } from './shared/Clock';

export interface FinishExamSessionDeps {
  examSessionRepository: ExamSessionRepository;
  attemptRepository: AttemptRepository;
  examRepository: ExamRepository;
  now: Clock;
}

export interface FinishExamSessionParams {
  examSessionId: string;
  userId: string;
  examId: string;
}

// Score is expressed as a 0-100 percentage of correct Attempts tied to
// this specific session (sequence is required whenever exam_session_id
// is present, so this is exactly this session's ordered answer set) —
// disclosed as a reasonable default, not a previously-specified format.
export class FinishExamSessionUseCase {
  constructor(private readonly deps: FinishExamSessionDeps) {}

  async execute(params: FinishExamSessionParams): Promise<ExamSession> {
    const session = await this.deps.examSessionRepository.getActive(
      params.userId,
      params.examId,
    );
    if (!session || session.id !== params.examSessionId) {
      throw new NotFoundError('ExamSession', params.examSessionId);
    }

    const exam = await this.deps.examRepository.getById(params.examId);
    if (!exam) {
      throw new NotFoundError('Exam', params.examId);
    }

    const attempts = await this.deps.attemptRepository.getBySession(params.examSessionId);
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    const score = attempts.length === 0 ? 0 : (correctCount / attempts.length) * 100;
    const passed = score >= exam.passingScore;

    return this.deps.examSessionRepository.update({
      ...session,
      status: 'COMPLETED',
      completedAt: this.deps.now(),
      score,
      passed,
    });
  }
}
