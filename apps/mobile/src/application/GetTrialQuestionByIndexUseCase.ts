import type { Question } from '../domain';
import type { QuestionRepository } from '../repositories/QuestionRepository';
import type { TrialAccessRepository } from '../repositories/TrialAccessRepository';
import type { TrialGrantSyncPort } from '../sync/types';

// Discriminated so the future QuestionScreen can render each outcome
// distinctly (a question, a natural end-of-package, "premium required,"
// a calm retry state, or something broken) without inspecting anything
// beyond `status`. CAP_REACHED/REJECTED/OFFLINE/NOT_VISIBLE_AFTER_GRANT/
// HYDRATION_FAILED intentionally share their shape with
// TrialGrantHydrationResult (sync/types.ts) — this use case returns
// TrialGrantSync's own non-GRANTED results directly rather than
// re-wrapping them.
export type GetTrialQuestionResult =
  | {
      status: 'QUESTION';
      question: Question;
      questionIndex: number;
      totalQuestions: number;
      // LOCAL_GRANTED: already had a local grant and the question was
      // already hydrated — no network call made.
      // SERVER_GRANTED: a new grant was requested and hydrated this call.
      // LOCAL_OFFLINE: server candidates were unreachable; served from
      // an already-granted question already present locally.
      source: 'LOCAL_GRANTED' | 'SERVER_GRANTED' | 'LOCAL_OFFLINE';
    }
  | { status: 'END' }
  | { status: 'NO_CANDIDATES' }
  | { status: 'CAP_REACHED' }
  | { status: 'OFFLINE' }
  | { status: 'REJECTED'; message: string }
  | { status: 'NOT_VISIBLE_AFTER_GRANT' }
  | { status: 'HYDRATION_FAILED'; cause: unknown };

export interface GetTrialQuestionByIndexDeps {
  questionRepository: QuestionRepository;
  trialAccessRepository: TrialAccessRepository;
  trialGrantSync: TrialGrantSyncPort;
}

export interface GetTrialQuestionByIndexParams {
  userId: string;
  packageId: string;
  questionIndex: number; // zero-based
}

// Drives the legacy trial Question Screen, one question at a time —
// deliberately not the eager whole-package fetch
// GetQuestionsByPackageUseCase performs, since that would request (and
// count against the cap) every question in the package regardless of
// whether the user ever reaches them (Phase 2B.4B's design). Never
// caches candidates locally (per instruction) — every call either
// re-queries trial_candidate_questions live, or, if that's unreachable,
// falls back to only what's already locally granted. No path in this
// use case can make an ungranted question available offline: the
// offline branch below only ever reads questions this device already
// holds a trial_access grant for.
export class GetTrialQuestionByIndexUseCase {
  constructor(private readonly deps: GetTrialQuestionByIndexDeps) {}

  async execute(params: GetTrialQuestionByIndexParams): Promise<GetTrialQuestionResult> {
    const { userId, packageId, questionIndex } = params;

    let candidates;
    try {
      candidates = await this.deps.trialGrantSync.getCandidates(packageId);
    } catch {
      // Server/network unavailable — do not mint access. Fall back to
      // only what this device already has a legitimate grant for.
      return this.getLocalOfflineFallback(userId, packageId, questionIndex);
    }

    if (candidates.length === 0) {
      return { status: 'NO_CANDIDATES' };
    }
    if (questionIndex >= candidates.length) {
      return { status: 'END' };
    }

    const totalQuestions = candidates.length;
    const questionId = candidates[questionIndex].questionId;

    const alreadyGranted = await this.deps.trialAccessRepository.hasGrant(userId, questionId);

    if (alreadyGranted) {
      const existing = await this.deps.questionRepository.getById(questionId);
      if (existing) {
        return {
          status: 'QUESTION',
          question: existing,
          questionIndex,
          totalQuestions,
          source: 'LOCAL_GRANTED',
        };
      }
      // Grant exists server-side but the question is missing locally
      // (e.g. a fresh reinstall before the next bulk pull catches up) —
      // fall through to requestAndHydrate, which is idempotent against
      // an already-existing grant and will simply rehydrate it.
    }

    const hydrationResult = await this.deps.trialGrantSync.requestAndHydrate({
      userId,
      packageId,
      questionId,
    });

    if (hydrationResult.status === 'GRANTED') {
      const question = await this.deps.questionRepository.getById(questionId);
      if (!question) {
        return { status: 'NOT_VISIBLE_AFTER_GRANT' };
      }
      return {
        status: 'QUESTION',
        question,
        questionIndex,
        totalQuestions,
        source: 'SERVER_GRANTED',
      };
    }

    return hydrationResult;
  }

  // Server/network unreachable: never requests a new grant, never
  // queries anything beyond what's already local. questionRepository.
  // getByPackage() is a local SQLite read (see SqliteQuestionRepository)
  // — not the Supabase package_questions table — already ordered by
  // display_order, so filtering it to already-granted questions
  // preserves package order without any extra sort.
  private async getLocalOfflineFallback(
    userId: string,
    packageId: string,
    questionIndex: number,
  ): Promise<GetTrialQuestionResult> {
    const packageQuestions = await this.deps.questionRepository.getByPackage(packageId);

    const grantFlags = await Promise.all(
      packageQuestions.map((question) =>
        this.deps.trialAccessRepository.hasGrant(userId, question.id),
      ),
    );
    const localGranted = packageQuestions.filter((_, index) => grantFlags[index]);

    if (questionIndex < localGranted.length) {
      return {
        status: 'QUESTION',
        question: localGranted[questionIndex],
        questionIndex,
        totalQuestions: localGranted.length,
        source: 'LOCAL_OFFLINE',
      };
    }

    return { status: 'OFFLINE' };
  }
}
