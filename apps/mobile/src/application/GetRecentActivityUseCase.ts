import type { ExamSessionRepository } from '../repositories/ExamSessionRepository';
import type { AttemptRepository } from '../repositories/AttemptRepository';

export type RecentActivityItem =
  | {
      type: 'DENEME_COMPLETED';
      id: string;
      score: number;
      passed: boolean;
      occurredAt: string;
    }
  | {
      type: 'QUESTION_SOLVED';
      id: string;
      isCorrect: boolean;
      occurredAt: string;
    };

export interface GetRecentActivityDeps {
  examSessionRepository: ExamSessionRepository;
  attemptRepository: AttemptRepository;
}

const MAX_ITEMS = 3;

// Backs Home's "Son Aktivite" section. Two real, structurally distinct
// local sources, deliberately not merged at the SQL level:
// - Completed Deneme sessions are shown once each, as the session
//   itself — a session's own per-question Attempts (exam_session_id
//   set) already feed Session Result's Konu Analizi, not this feed, so
//   nothing here is double-counted.
// - Practice/repeat/trial Attempts are only ever standalone
//   (exam_session_id IS NULL); a Deneme's own attempts are already
//   represented by its completed session above.
// Merged in memory by timestamp, most recent first, capped at 3.
export class GetRecentActivityUseCase {
  constructor(private readonly deps: GetRecentActivityDeps) {}

  async execute(userId: string): Promise<RecentActivityItem[]> {
    const [sessions, attempts] = await Promise.all([
      this.deps.examSessionRepository.getRecentCompleted(userId, MAX_ITEMS),
      this.deps.attemptRepository.getRecentStandalone(userId, MAX_ITEMS),
    ]);

    const sessionItems: RecentActivityItem[] = sessions
      .filter((session) => session.completedAt !== null && session.score !== null)
      .map((session) => ({
        type: 'DENEME_COMPLETED',
        id: session.id,
        score: session.score as number,
        passed: session.passed ?? false,
        occurredAt: session.completedAt as string,
      }));

    const attemptItems: RecentActivityItem[] = attempts.map((attempt) => ({
      type: 'QUESTION_SOLVED',
      id: attempt.id,
      isCorrect: attempt.isCorrect,
      occurredAt: attempt.answeredAt,
    }));

    return [...sessionItems, ...attemptItems]
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
      .slice(0, MAX_ITEMS);
  }
}
